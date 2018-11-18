前言：babel的发明是为了将ES6语法转换成浏览器支持的ES5语法，那么只用babel不行吗？为什么后来还有了babel-polyfill？因为babel默认只是转换语法，比如箭头函数，解构等ES6写法，但是不转换API，比如Object.assign，Array.from等，所以发明babel-polyfill是为了转换新规范中的API的。

一、先说说babel-polyfill

拿Object.assign举例，babel-polyfill会重写Object原型上的方法，用ES5的语法实现一个assign方法。所以polyfill会修改全局变量，造成全局变量的污染，这也就意味着polyfill的使用场景通常是业务应用，它不适用于JS库或者框架，因为你不能确定使用JS框架的开发者的app运行环境是什么，也许会对开发者的业务代码造成不好的影响。

在业务中使用的时候需要注意，如果直接在JS文件中引入require('babel-polyfill')，会导致编译出来包很大，但其实polyfill中有很多我们业务场景中用不到的方法，那么有没有一种方式，可以按需加载需要的编译函数呢？有，babel-runtime和babel-polyfill最大的区别就是它可以按需引入帮助函数，从而减少编译出来的代码量。

二、babel-runtime是为了解决什么问题诞生的呢？

Babel默认转换ES5语法的时候会创建一些帮助函数，例如：

```
const key = 'babel'
const obj = {
    [key]: 'foo',
}
```

转换出来就是：

```
function _defineProperty(obj, key, value) {
    if (key in obj) {
       Object.defineProperty(obj, key, 
        { value: value, 
        enumerable: true, 
        configurable: true, 
        writable: true 
        });
    } else {
        obj[key] = value;
    }
    return obj;
}

var key = 'babel';
var obj = _defineProperty({}, key, Object.assign({}, { key: 'foo' }));
```

那如果其他模块也用到了这个语法的话，就会转译出很多重复的帮助函数代码，因此发明了babel-runtime，配合babel-plugin-transform-runtime一起用，babel-plugin-transform-runtime是在构建的时候使用的，而babel-runtime是在生产环境中也要用的，启动插件 `babel-plugin-transform-runtime` 后，编译出来的效果是：

```
'use strict';
// 之前的 _defineProperty 函数已经作为公共模块 `babel-runtime/helpers/defineProperty` 使用
var _defineProperty2 = require('babel-runtime/helpers/defineProperty');
var _defineProperty3 = _interopRequireDefault(_defineProperty2);
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
var obj = (0, _defineProperty3.default)({}, 'name', 'JavaScript');
```

而且babel还为babel-runtime/helps 下的工具函数自动引用了 polyfill，这样既避免了全局变量的污染，又减少了打包体积，所以目前很多项目中的babel转换是babel-runtime配合babel-plugin-transform-runtime一起用的。

但是babel-runtime无法提供实例方法，因为它不会修改原型方法，因此如果项目中需要写这样的代码：`'abc'.includes('b')`，就还是需要引入babel-polyfill。

三、babel-preset-env插件

这个插件可以使开发者在babelrc文件中设置想要的配置，比如项目运行环境是在浏览器端，而且是特定版本的浏览器，就可以用target属性来配置，例如：

```
{
   "presets": [
       ["env", {
            "targets": {
                 "browsers": [ "ie >= 8", "chrome >= 62" ]
            }      
    }]
   ]
}
```

这样在babel编译的时候也可以有选择的引用插件，不会把所有的插件都引入进来，从而导致编译出冗余代码。

如果babelrc文件中既有plugins，又有preset，例如：

```
{
  "presets": [
    ["env", {
      "modules": false,
      "targets": {
        "browsers": ["> 1%", "last 2 versions", "not ie <= 8"]
      }
    }],
    "stage-0"
  ],
  "plugins": ["transform-runtime"],
  },
}
```

执行顺序如下：

- plugin 会运行在preset之前
- plugin 会从第一个开始顺序执行
- preset 的顺序则刚好相反(从最后一个逆序执行)



参考资料： 

https://juejin.im/entry/5b108f4c6fb9a01e5868ba3d

https://segmentfault.com/q/1010000005596587?from=singlemessage&isappinstalled=1



