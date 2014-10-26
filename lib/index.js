var marked = require('marked');
var _ = require('lodash');

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
    this.images = []
  },
  eof: function() {

  },
  image: function(href, title, text) {
    this.images.push({
      href: href,
      title: title,
      text: text
    });
    return this._super.image.bind(marked)(href, title, text);
  }
});

var CompactRenderer = override(Renderer, {

});

marked.setOptions({
  langPrefix: ''
});

hexo.extend.filter.register('after_post_render', function(data, callback){
  var r = config.excerpt_compact ? new CompactRenderer() : new Renderer();

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

  if (data.excerpt && !config.excerpt_force) {
    data.excerpt = r.excerpt;
  }
  data.toc = r.toc;
  data.images = r.images;
  //data.videos = r.videos;

  callback(null, data);
  return;
});
