var marked = require('marked');
var _ = require('lodash');
var htmlparser = require("htmlparser2");

var config = _.extend(
  {
    excerpt_length: 200,
    excerpt_ignore: ['img', 'figure'],
    excerpt_force: false,
    excerpt_compact: false
  },
  hexo.config.richer);

var DefaultRenderer = marked.Renderer;

function override(parent, prop) {
  if (prop == null || typeof(prop) != 'object') {
    return parent;
  }

  var overrided = function () { parent.call(this); }
  overrided.prototype = _.create(parent.prototype, _.assign({
    '_super': parent.prototype,
    'constructor': overrided
  }, prop));
  return overrided;
}

var Renderer = override(DefaultRenderer, {
  init: function() {
    this.images = [];
    this.toc = {
      level: 0,
      text: 'root',
      toc: []
    };
    this.stack = [];
    this.last = this.toc;
  },
  eof: function() {

  },
  image: function(href, title, text) {
    this.images.push({
      href: href,
      title: title,
      text: text
    });
    return this._super.image.apply(this, arguments);
  },
  heading: function(text, level, raw) {
    var node = {
      level: level,
      text: text,
      toc: []
    }

    // Peek
    var top = this.stack.pop();
    this.stack.push(top);

    if (level == this.last.level) {
      // Same level, parent is top
      top.toc.push(node);
    } else if (level > this.last.level) {
      // Level goes down, parent is last
      this.last.toc.push(node);
      this.stack.push(this.last);
    } else {
      // Level goes up, find parent in stack
      while (top.level >= level) {
        top = this.stack.pop();
      }
      top.toc.push(node);
      this.stack.push(top);
    }

    this.last = node;

    return this._super.heading.apply(this, arguments);
  }
});

marked.setOptions({
  langPrefix: ''
});

function getExcerpt(html) {
  var DOM;
  var handler = new htmlparser.DomHandler(function (error, dom) {
    if (error)
      console.error(error);
    else
      DOM = dom;
  });
  var parser = new htmlparser.Parser(handler);
  parser.write(html);
  parser.done();
  var root = {
    type: 'root',
    children: DOM,
    attribs: []
  }

  var currentLen = 0;
  // DFS on DOM
  function visit(parent, node) {
    if (currentLen >= config.excerpt_length) return false;
    var len = 0;
    var dirty = false;
    if (node.type == 'text') {
      len = node.data.length;
      if (len + currentLen > config.excerpt_length) {
        len = config.excerpt_length - currentLen;
        node.data = node.data.substring(0, len);
        // Marked as trimed for styling
        if (parent != null) {
          if (!('class' in parent.attribs)) {
            parent.attribs['class'] = "trimed";
          } else {
            parent.attribs['class'] += " trimed";
          }
        }
      }
      // Update length
      currentLen += len;
      node.dirty = dirty = true;
    } else if (node.type == 'tag' || node.type == 'root') {
      if (node.name in config.excerpt_ignore)
        return false;
      for (var i = 0; i < node.children.length; i++) {
        if (visit(node, node.children[i])) {
          dirty = true;
          node.dirty = true;
        }
      }
    }
    return dirty;
  }

  visit(null, root);
  function render(node) {
    if (!node.dirty)
      return "";
    if (node.type == 'text')
      return node.data;
    var before = "";
    var after = "";
    if (node.type == 'tag') {
      var attr = "";
      for (var key in node.attribs) {
        attr += ' ' + key + '="' + node.attribs[key] + '"'
      }
      before = "<" + node.name + attr + ">";
      after = "</" + node.name + ">";
    }

    var content = "";
    for (var i = 0; i < node.children.length; i++) {
      content += render(node.children[i]);
    }
    return before + content + after;
  }

  var html = render(root);
  return html;
  var cache = [];
}

hexo.extend.filter.register('after_post_render', function(data, callback){
  var r = new Renderer();

  r.init();
  var html = marked(data.raw, {
    renderer: r,
    gfm: true,
    pedantic: false,
    sanitize: false,
    tables: true,
    breaks: true,
    smartLists: true,
    smartypants: true
  });
  r.eof();
  if (config.excerpt_force || !data.excerpt || data.excerpt === "") {
    data.excerpt = getExcerpt(data.content);
  }
  data.toc = r.toc;
  data.images = r.images;
  //data.videos = r.videos;

  callback(null, data);
  return;
});
