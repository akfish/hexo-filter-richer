hexo-filter-richer
===================

A hexo filter plugin that generates richer post information for theme developers.

Features:
- [ ] Automatic excerpt
- [ ] Table of content
- [x] Image list
- [ ] Video list
- [ ] Theme script extension

## Install

> npm install hexo-filter-richer --save

## Configuration

In blog's `_config.yml` file:

```ymal
richer:
  excerpt_length: 100     # Max length of excerpt
  excerpt_ignore:         # Elements to be excluded from excerpt
  - img
  - code
  excerpt_force: false    # Set to true will override any excerpts generated from <!-- more --> tags
  excerpt_compact: false  # Set to true will generated compact excerpt (single line, no media)
```

## Theme Script Extension

(TBD)
