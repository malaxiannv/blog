之前看到CommonJS、AMD、CMD、ES6这些名词就一脸懵逼，现在终于搞明白了，赶紧来梳理记录一下。

一、CommonJS

它是在Node环境下运行的规范，输入输出的方式如下：

```
//b.js文件
var name = 'lily'
module.exports = {name: name}

//a.js文件
var name = require('b').name
console.log('我是a文件，我拿到了b.js文件的参数', name);
```

这套机制在Node环境下支持的很好，但是浏览器不支持，所以最开始发明webpack等打包工具，也是为了让开发者以模块的形式开发，最后编译成浏览器能识别的JS文件。

CommonJS的好处是，模块化开发，不会污染全局变量，而且引用关系明确，方便项目维护。

不好的点就是引用的资源是同步下载的，比如在a.js文件中，必须得等b文件下载完，才会执行下面的console.log语句。

所以后来又发明了AMD规范来解决这个痛点。

二、AMD和CMD

AMD全称是异步模块定义，顾名思义，就是可以先执行和依赖无关的代码，等依赖加载完毕，再去执行和依赖相关的代码。CMD也是可以异步执行的规范，AMD和CMD都是针对浏览器发明的规范，分别由RequireJS和SeaJS来实现。二者最主要的区别就是AMD是依赖前置，也就是说当前文件需要的所有依赖都要先引入，而CMD是就近依赖，也就是说可以等用到这个资源的时候再引入。如下所示：

```
1. AMD用法
//定义模块 module.js
define(['dependency'], function() {
    var name = 'Allen'
    function sayName() {
        console.log(name)
    }
    return {
        sayName: sayName
    }
})

//加载
require(['module'], function(mod) {
    mod.sayName
})

2.CMD用法
define(function(require, exports, module) {
   var clock = require('clock');
   clock.start();
});
```

AMD和CMD要逐渐被淘汰了，这是因为ES6的出现，统一了模块化的写法，而且各大浏览器厂商也在努力支持ES6中，而且目前可以配合webpack，在项目中用ES6的语法去开发。

三、ES6

```
//a.js
var count = 1
export default count

//b.js
import a from 'a.js'
console.log('=====', a)
```

ES6是针对浏览器发明的规范，相信不久的将来，浏览器能够全部支持es6，我们构建项目时也能轻松很多。

参考资料：

https://github.com/Jiavan/js-demo/tree/master/AMD%E8%A7%84%E8%8C%83%E5%8F%8A%E7%BC%96%E5%86%99%E6%A8%A1%E5%9D%97%E5%8C%96%E7%9A%84%E4%BB%A3%E7%A0%81



