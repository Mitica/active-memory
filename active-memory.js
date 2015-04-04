(function(root) {

  if (typeof define === "function" && define.amd) {
    define([""], function() {
      return (root.activeMemory = ActiveMemoryBuilder);
    });
  } else if (typeof exports === "object") {
    module.exports = ActiveMemoryBuilder;
  } else {
    root.activeMemory = ActiveMemoryBuilder;
  }


  function ActiveMemoryBuilder(options) {

    options = utils.defaults(options, {
      ttl: 0,
      idName: 'id'
    });

    var cache = {};

    var internal = {
      getIdName: function(type) {
        return options.idName;
      },
      createCacheItem: function(value, opts) {
        var expires = opts && utils.isNumber(opts.ttl) ? opts.ttl : options.ttl;
        if (expires > 0) {
          expires = Date.now() + expires;
        }
        //console.log('expires', expires, opts, options);
        return {
          format: utils.isArray(value) ? 'l' : 'i',
          value: value,
          expires: expires
        };
      },
      container: function(type) {
        return cache[type] || (cache[type] = {
          all: {},
          item: {},
          list: {}
        });
      },
      pick: function(type, key) {
        var container = internal.container(type);
        return container.all[key];
      },
      get: function(type, key) {
        var item = internal.pick(type, key);
        if (!item) return;
        if (internal.isExpired(item)) {
          internal.clearKey(type, key);
          return;
        }

        return item.value;
      },
      set: function(type, key, value, opts) {
        var item = internal.pick(type, key);

        if (item) {
          return internal.update(type, key, value, opts);
        }
        item = internal.createCacheItem(value, opts);

        var container = internal.container(type);
        container.all[key] = item;
        if (item.format === 'i') {
          container.item[key] = item;
        } else {
          container.list[key] = item;
        }
      },
      update: function(type, key, value, opts) {
        //console.log('updating', type, key, value);
        var container = internal.container(type);
        var item = container.all[key];
        if (!item) return;

        if (item.format === 'i') {
          for (var prop in value) {
            item.value[prop] = value[prop];
          }
          internal.updateListsItem(type, item, opts);
        } else {
          item.value.splice(0, item.value.length);
          value.forEach(function(it) {
            item.value.push(it);
          });
        }
      },
      updateListsItem: function(type, item, opts) {
        //console.log('updating updateListsItem', type, item);
        var container = internal.container(type);
        var listsItemInfo = internal.getListsItemInfo(container, type, item);
        //console.log(listsItemInfo);
        for (var i = listsItemInfo.length - 1; i >= 0; i--) {
          var info = listsItemInfo[i];
          for (var prop in item.value) {
            info.item[prop] = item.value[prop];
          }
        }
      },
      isExpired: function(item) {
        return item.expires > 0 && Date.now() > item.expires;
      },
      remove: function(type, key) {
        var container = internal.container(type);
        var item = container.all[key];
        return internal.removeItem(container, type, key, item);
      },
      clear: function() {
        cache = {};
      },
      clearKey: function(type, key) {
        var container = internal.container(type);
        delete container.all[key];
        delete container.item[key];
        delete container.list[key];
      },
      removeItem: function(container, type, key, item) {
        delete container.all[key];
        delete container.item[key];
        delete container.list[key];
        if (item && item.format === 'i') {
          var listsItemInfo = internal.getListsItemInfo(container, type, item);
          for (var i = listsItemInfo.length - 1; i >= 0; i--) {
            var info = listsItemInfo[i];
            info.list.splice(info.index, 1);
          }
        }
      },
      getListsItemInfo: function(container, type, item) {
        var idName = internal.getIdName(type);
        //console.log(idName);
        var result = [];
        for (var key in container.list) {
          //console.log('key', key, container.list[key]);
          var list = container.list[key].value;
          for (var i = list.length - 1; i >= 0; i--) {
            var it = list[i];
            //console.log('compare', it[idName], item.value[idName]);
            if (it[idName] === item.value[idName]) {
              result.push({
                list: list,
                item: it,
                index: i
              });
              break;
            }
          }
        }
        return result;
      }
    };

    var am = {
      get: function(type, key) {
        return internal.get(type, key);
      },
      set: function(type, key, value, opts) {
        return internal.set(type, key, value, opts);
      },
      remove: function(type, key, opts) {
        return internal.remove(type, key, opts);
      },
      clear: internal.cache
    };

    return am;
  }


  var utils = {
    defaults: function(options, defaults) {
      options = options || {};

      Object.keys(defaults).forEach(function(key) {
        if (typeof options[key] === 'undefined') {
          options[key] = defaults[key];
        }
      });

      return options;
    },
    isArray: function(target) {
      return Array.isArray(target);
    },
    isNumber: function(target) {
      return typeof target === 'number';
    }
  };
})(this);
