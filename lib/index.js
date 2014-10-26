var marked = require('marked');
var _ = require('lodash');
var cheerio = require('cheerio');

var config = _.extend(
  {
    excerpt_length: 100,
    excerpt_ignore: [],
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

hexo.extend.filter.register('after_post_render', function(data, callback){
  var r = new Renderer();

  r.init();
  // TODO: data.raw contains front-matter
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
    data.excerpt = r.excerpt;
  }
  data.toc = r.toc;
  data.images = r.images;
  //data.videos = r.videos;

  callback(null, data);
  return;
});
