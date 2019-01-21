webpack最大的作用就是可以把模块化开发的代码打包成浏览器能够解析的代码，那webpack是如何实现这个功能的呢？我们从打包后的代码中分析一下实现原理。

## 准备工作，从最简单的版本开始：

1.新建一个空文件夹，执行npm init，创建一个package.json文件

2.执行`npm install --save-dev webpack`以及`npm install --save-dev webpack-cli`安装webpack4

3.创建项目文件

```
//index.html
<html>
<head>
  <meta charset="UTF-8">
</head>
<body>
<div id="app"></div>
<!--导入 Webpack 输出的 JavaScript 文件-->
<script src="./dist/bundle.js"></script>
</body>
</html>

//main.js
const show = require('./show.js')
show('Webpack')

//show.js
function show(content) {
  window.document.getElementById('app').innerText = 'Hello,' + content
}

module.exports = show

//webpack.config.js
const path = require('path');

module.exports = {
  entry: './main.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, './dist'),
  },
  mode: 'development'
};
```

4.给package.json文件添加脚本`"start": "webpack --config webpack.config.js"`，然后执行npm start，会生成一个bundle.js文件，接下来我们就逐步分析这个bundle.js文件的内容。

## bundle.js文件

```
(function(modules) {
   	var installedModules = {};
  
   	function __webpack_require__(moduleId) {
  
   		if(installedModules[moduleId]) {
   			return installedModules[moduleId].exports;
   		}

   		var module = installedModules[moduleId] = {
   			i: moduleId,
   			l: false,
   			exports: {}
   		};
  
   		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
   		module.l = true;
   		return module.exports;
   	}
  
  
   	__webpack_require__.m = modules;
  
   	// expose the module cache
   	__webpack_require__.c = installedModules;
  
   	// define getter function for harmony exports
   	__webpack_require__.d = function(exports, name, getter) {
   		if(!__webpack_require__.o(exports, name)) {
   			Object.defineProperty(exports, name, { enumerable: true, get: getter });
   		}
   	};
  
   	// define __esModule on exports
   	__webpack_require__.r = function(exports) {
   		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
   			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
   		}
   		Object.defineProperty(exports, '__esModule', { value: true });
   	};
  
   
   	__webpack_require__.t = function(value, mode) {
   		if(mode & 1) value = __webpack_require__(value);
   		if(mode & 8) return value;
   		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
   		var ns = Object.create(null);
   		__webpack_require__.r(ns);
   		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
   		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
   		return ns;
   	};
  
   	// getDefaultExport function for compatibility with non-harmony modules
   	__webpack_require__.n = function(module) {
   		var getter = module && module.__esModule ?
   			function getDefault() { return module['default']; } :
   			function getModuleExports() { return module; };
   		__webpack_require__.d(getter, 'a', getter);
   		return getter;
   	};
  
   	// Object.prototype.hasOwnProperty.call
   	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
  
   	// __webpack_public_path__
   	__webpack_require__.p = "";
  
  
   	// Load entry module and return exports
   	return __webpack_require__(__webpack_require__.s = "./main.js");
   })({
        "./main.js":
        (function(module, exports, __webpack_require__) {
          eval("const show = __webpack_require__(/*! ./show.js */ \"./show.js\")\nshow('Webpack')\n\n//# sourceURL=webpack:///./main.js?");
        }),
        
        "./show.js":
        (function(module, exports) {
          eval("function show(content) {\n  window.document.getElementById('app').innerText = 'Hello,' + content\n}\n\nmodule.exports = show\n\n//# sourceURL=webpack:///./show.js?");
        })
   })
```

首先看下这个文件的简化版结构：

```
(function(modules) {
   	var installedModules = {};
  
   	function __webpack_require__(moduleId) {
      ...
    }
     
   	// Load entry module and return exports
   	return __webpack_require__(__webpack_require__.s = "./main.js");
   })({
       ...
   })
```

可以看到webpack打包出来的文件是一个立即执行函数，该函数的参数是一个对象，我们先看下这个对象参数是什么

```
{
        "./main.js":
        (function(module, exports, __webpack_require__) {
          eval("const show = __webpack_require__(/*! ./show.js */ \"./show.js\")\nshow('Webpack')\n\n//# sourceURL=webpack:///./main.js?");
        }),
        
        "./show.js":
        (function(module, exports) {
          eval("function show(content) {\n  window.document.getElementById('app').innerText = 'Hello,' + content\n}\n\nmodule.exports = show\n\n//# sourceURL=webpack:///./show.js?");
        })
}
```

可以看到webpack把各个JS文件的信息存入了一个对象中，对象的属性是这些JS文件的相对路径，比如'./main.js'，属性值是一个函数，执行该函数，就会把该JS文件中的代码eval执行出来。

接下来逐步解析webpack编译出来的这个大函数

```
function(modules) {
   	var installedModules = {};
  
   	function __webpack_require__(moduleId) {
      ...
    }
     
   	// Load entry module and return exports
   	return __webpack_require__(__webpack_require__.s = "./main.js");
   }
```

其中这个modules参数就是上面分析的那个对象，installedModules用于存放已加载过的module信息，这个函数的返回值是`__webpack_require__("./main.js")`，可见`__webpack_require__`函数中的moduleId就是文件的相对路径，要想知道这个函数最终的返回值是什么，还要详细解析`__webpack_require__`函数。

```
function __webpack_require__(moduleId) {
  
   		if(installedModules[moduleId]) {
   			return installedModules[moduleId].exports;
   		}

   		var module = installedModules[moduleId] = {
   			i: moduleId,
   			l: false,
   			exports: {}
   		};
  
   		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
   		module.l = true;
   		return module.exports;
   	}
```

这个函数的逻辑还是很简单的，首先判断'./main.js'这个模块是否已经加载过，如果加载过，就直接返回缓存值`installedModules[moduleId].exports`，如果未加载过，就新创建一个module对象，并把这个对象值缓存。

modules[moduleId]的值是个函数，比如modules['./main.js']的值如下：

```
function(module, exports, __webpack_require__) {
          eval("const show = __webpack_require__(/*! ./show.js */ \"./show.js\")\nshow('Webpack')\n\n//# sourceURL=webpack:///./main.js?");
 }
```

执行`modules[moduleId].call(module.exports, module, module.exports, __webpack_require__)`，就是执行上面那个函数，我们详细看下eval中的值：

```
const show = __webpack_require__(/*! ./show.js */ \"./show.js\")
show('Webpack')
```

可以看到eval要执行的代码其实就是文章开头我们创建的main.js中的代码，先看第一句，递归的调用了`__webpack_require__("./show.js\")`，又进入了`__webpack_require__`函数中，因为这个模块还未被加载过，因此会创建一个新的module，moduleId就是'./show.js'，接下来调用函数modules['./show.js']，进入到show.js中的eval函数中

```
function(module, exports) {
          eval("function show(content) {\n  window.document.getElementById('app').innerText = 'Hello,' + content\n}\n\nmodule.exports = show\n\n//# sourceURL=webpack:///./show.js?");
}

//eval语句
function show(content) {
  window.document.getElementById('app').innerText = 'Hello,' + content
}

module.exports = show
```

执行完eval语句，'./show.js'这个module对象的exports属性值就show函数了，`__webpack_require__('./show.js')`函数中最后一句是`return module.exports`，表示返回一个show函数，因此这条语句`const show = __webpack_require__(/*! ./show.js */ \"./show.js\")`得到的show变量就是show.js中定义的show方法。接下来执行`show('Webpack')`，window中id为app的DOM元素内部就加上了'Hello, Webpack'。

接下来看`__webpack_require__(moduleId)`函数中的下一句`module.l = true`，给module模块的l属性值设为true，这个属性用来标识当前模块中的代码已经解析完毕，最后一句`return module.exports`，因为main.js中没有对这个变量赋值，因此`__webpack_require__('./main.js')`函数的返回值是一个空对象，也就是说整体的webpack立即函数的函数值是一个空对象，因为最后一句是`return __webpack_require__(__webpack_require__.s = "./main.js")`。

至此webpack的主体结构我们就分析完毕了，我们来做个总结，webpack打包出来的函数是一个立即执行函数，这个函数的参数是一个对象，对象中存放着各个JS文件的信息，webpack会把文件之间的依赖require替换成自定义的` __webpack_require__`函数，在这个函数中会返回module.exports的返回值，这就是webpack打包CommonJS模块的流程。

参考链接：https://juejin.im/entry/5c3a220d6fb9a049ae081fc5