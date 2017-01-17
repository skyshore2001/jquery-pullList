/**
@module jquery-pullList

为支持分页的列表添加下拉刷新和上拉加载功能。

假设后端支持分页，取某列表接口的原型如下：

	getOrderList(pagekey?=1, pagesz?=20) => { nextkey?, @list={id, name} }

每次返回一页数据，用nextkey属性表示取下一页时请求中的pagekey参数，如果是最后一页，则没有nextkey属性。
请求示例：

	GET http://server/app/getOrderList?pagekey=1&pagesz=20

返回示例：

	{ nextkey: 2, list=[ {id:1, name: "item 1"} ,...] }

下面举例说明用法，详细可参考 exmaple/index.html 中的例子。

## 下拉列表示例

例：页面元素如下：

	<style>
	.bd {
		overflow-y: auto;
		height: 400px;
	}
	</style>
	<div>
		<div class="bd">
			<div class="p-list"></div>
		</div>
	</div>

其中，类p-list作为列表，类bd作为容器，设置了确定的高度（实际项目中一般用js设置高度），从而在超出时可显示滚动条。

设置支持分页的下拉列表的示例代码如下：

	var pullListOpt = {
		onLoadItem: showOrderList,
		//autoLoadMore: false
	};
	$(".bd").pullList(pullListOpt);

	function showOrderList(isRefresh)
	{
		var jlst = $(".p-list");
		var param = {pagesz: 20};
		if (isRefresh) {
			// 刷新列表
			jlst.empty();
			param.pagekey = 1;
		}
		else {
			// 加载下一页
			var pagekey = jlst.data("nextkey");
			// 已是最后一页，不再加载更多
			if (pagekey == null)
				return;
			param.pagekey = pagekey;
		}

		callSvr("getOrderList", param, function (data) {
			// create items and append to jlst
			$.each(data.list, function () {
				$("<li>" + this.name + "</li>").appendTo(jlst);
			});

			// 处理下一页参数
			if (data.nextkey)
				jlst.data("nextkey", data.nextkey);
			else
				jlst.removeData("nextkey");
		});
	}
	showOrderList(true);

运行示例，下拉可刷新，上拉滚动到底可自动加载。如果想手动加载可设置选项`autoLoadMore = false`:

	var pullListOpt = {
		onLoadItem: showOrderList,
		autoLoadMore: false
	};
	$(".bd").pullList(pullListOpt);

## autoload事件示例（自动上拉加载）

@key example-autoload

autoload事件可用于滚动到底自动加载，不支持下拉刷新。接上例，我们不用pullList方法，直接设置事件即可：

	// $(".bd").pullList(pullListOpt);
	$(".bd").on("autoload", function (ev) {
		showOrderList();
	});

一般用于简易分页加载场景。

## 定制提示信息

可设置CSS类mui-pullPrompt来定制提示信息的显示格式，如

	.mui-pullPrompt {
		background-color: yellow;
	}

可设置CSS类mui-pullHint来指定hint显示的位置，默认是在容器的顶部。

	<div>
		<div class="bd"> <!-- pullList容器 -->
			<p class="mui-pullHint">hello</p>  <!-- 如果未指定mui-pullHint，默认提示信息是显示容器顶部，即这行之上; 指定后，提示信息显示在该对象后面 -->
			<div class="p-list"></div>
		</div>
	</div>

可设置选项prefix来修改这些类名，如

	$.fn.pullList.defaults.prefix = "jd";

则CSS类名变为：`jd-pullPrompt`, `jd-pullHint`.

如果要修改提示信息，可提供回调函数 onHintText;
如果要定制动画效果，可提供回调函数 onHint.

@see $.fn.pullList
*/
/*
测试用例

- 组件自身可出现滚动条，可下拉刷新，上拉到底时自动加载。
- 组件自身无滚动条，但再向上有组件有滚动条，可下拉刷新，上拉到底时自动加载。
- 组件自身及向上均无滚动条（如一开始pagesz很小，没有填满容器），可下拉刷新，上拉到底时自动加载。
- 一开始组件及父组件均无滚动条，后出现滚动条（或相反，滚动条从有到无，如加载很多记录后再刷新，未占满屏幕），可下拉刷新，上拉到底时自动加载。

- 设置opt.autoLoadMore=false时，可手工上拉刷新
- 在android/safari下分别测试
- 在加载很慢时（如接口返回时间>=5s），测试反复下拉或上拉是否多次调用。
- 在多个组件的滚动组件（scrollContainer_）相同时，检测是否冲突。
*/
function jquery_pullList($) {

var m_version = '1.0';

var m_exposed = {
/**
@fn jquery-pullList.version()

取版本号:

	var ver = jo.pullList("version");

 */
	version: function (jo) {
		return m_version;
	}
};

var m_defaults = {
	prefix: "mui",
	threshold: 180,
	autoLoadMore: true,
	TRIGGER_AUTOLOAD: 30, // px
};

/**
@event autoload

滚动到底部时，触发自动加载事件。

@see example-autoload
*/
$.event.special["autoload"] = {
	setup: function () {
		var busy_ = false;
		var jo = $(this);
		jo.on("scroll.autoload", function (ev) {
			if (getScrollToBottom(jo[0]) < m_defaults.TRIGGER_AUTOLOAD) {
				if (!busy_) {
					busy_ = true;
					ev.type = 'autoload';
					jo.trigger(ev);
					scrollToBottom(jo[0]);
				}
			}
			else {
				busy_ = false;
			}
		});
	},
	teardown: function () {
		$(this).off("scroll.autoload");
	}
};

/**
@fn $.fn.pullList(opt?)
@fn $.fn.pullList(method, param1, ...)

初始化pullList，或调用pullList的方法。

@param opt 可选项，详细见下文。

@param opt.onLoadItem function(isRefresh)

在合适的时机，它调用 onLoadItem(true) 来刷新列表，调用 onLoadItem(false) 来加载列表的下一页。
在该回调中this为container对象（即容器）。实现该函数时应当自行管理当前的页号(pagekey)

@param opt.autoLoadMore?=true 当滑动到页面下方时（距离底部$.fn.pullList.defaults.TRIGGER_AUTOLOAD=30px以内）自动加载更多项目。

@param opt.threshold?=180 像素值。

手指最少下划或上划这些像素后才会触发实际加载动作。

@param opt.TRIGGER_AUTOLOAD?=30 距离滚动到底的像素值，进入此范围触发自动加载。

@param opt.prefix?="mui"  类名前缀

影响以下名称：

- CSS类`mui-pullPrompt` 下拉刷新/上拉加载提示块
- CSS类`mui-pullHint` 指定下拉提示显示位置

@param opt.onHint function(ac, dy, threshold)

	ac  动作。"D"表示下拉(down), "U"表示上拉(up), 为null时应清除提示效果.
	dy,threshold  用户移动偏移及临界值。dy>threshold时，认为触发加载动作。

提供提示用户刷新或加载的动画效果. 缺省实现是下拉或上拉时显示提示信息。

@param opt.onHintText function(ac, uptoThreshold)

修改用户下拉/上拉时的提示信息。仅当未设置onHint时有效。onHint会生成默认提示，如果onHintText返回非空，则以返回内容替代默认内容。
内容可以是一个html字符串，所以可以加各种格式。

	ac:: String. 当前动作，"D"或"U".
	uptoThreshold:: Boolean. 是否达到阈值

@param opt.onPull function(ev)

如果返回false，则取消上拉加载或下拉刷新行为，采用系统默认行为。

@see jquery-pullList
 */
$.fn.extend({
	pullList: function(opt) {
		var args = arguments;
		if (typeof(opt) == "string")
		{
			var fname = opt;
			if (! m_exposed[fname])
				$.error("*** unknown call: " + fname);

			args[0] = this;
			return m_exposed[fname].apply(args[0], args);
		}

		return this.each(function () {
			initPullList(this, opt);
		});
	}
});

/**
@var $.fn.pullList.defaults

为pullList设置缺省选项，如：

	$.fn.pullList.defaults.threshold = 200;

可设置的选项参考：

@see $.fn.pullList
*/
$.fn.pullList.defaults = m_defaults;

// NOTE: 不要用clientHeight，有兼容问题。
// return: distance to bottom
function getScrollToBottom(o)
{
	//return o.scrollHeight - o.clientHeight - o.scrollTop;
	return o.scrollHeight - $(o).outerHeight(true) - o.scrollTop;
}

function canScroll(o)
{
	return o.scrollHeight > $(o).outerHeight(true);
}

function isScrollBottom(o)
{
	// NOTE: 华为mate7(安卓6.0)滚动到底，仍可能有1px的差弃。
	return getScrollToBottom(o) <= 1;
}

function scrollToBottom(o)
{
	o.scrollTop = o.scrollHeight - o.clientHeight;
}

/**
@fn initPullList(container, opt)

等价于

	$(container).pullList(opt);

@see $.fn.pullList
*/
window.initPullList = initPullList;
function initPullList(container, opt)
{
	var opt_ = $.extend({
		onHint: onHint
	}, m_defaults, opt);

	var cont_ = container;
	var scrollContainer_ = null; // 实际出现滚动条的组件

	var touchev_ = null; // {ac, x0, y0}
	var mouseMoved_ = false;

	if ("ontouchstart" in window) {
		cont_.addEventListener("touchstart", touchStart);
		cont_.addEventListener("touchmove", touchMove);
		cont_.addEventListener("touchend", touchEnd);
		cont_.addEventListener("touchcancel", touchCancel);
	}
	else {
		cont_.addEventListener("mousedown", mouseDown);
	}
	if ($(cont_).css("overflowY") == "visible") {
		cont_.style.overflowY = "auto";
	}

	function getPos(ev)
	{
		var t = ev;
		if (ev.changedTouches) {
			t = ev.changedTouches[0];
		}
		return [t.pageX, t.pageY];
	}

	var jo_;
	function onHint(ac, dy, threshold)
	{
		var msg = null;
		if (jo_ == null) {
			// mui-pullPrompt
			var pullPromptCls = m_defaults.prefix + "-pullPrompt";
			jo_ = $("<div class='" + pullPromptCls + "'></div>");
		}

		var uptoThreshold = dy >= threshold;
		if (ac == "U") {
			msg = uptoThreshold? "<b>松开加载~~~</b>": "即将加载...";
		}
		else if (ac == "D") {
			msg = uptoThreshold? "<b>松开刷新~~~</b>": "即将刷新...";
		}
		if (opt_.onHintText) {
			var rv = opt_.onHintText(ac, uptoThreshold);
			if (rv != null)
				msg = rv;
		}
		var height = Math.min(dy, 100, 2.0*Math.pow(dy, 0.7));

		if (msg == null) {
			jo_.height(0).remove();
			return;
		}
		jo_.html(msg);
		jo_.height(height).css("lineHeight", height + "px");
			
		if (ac == "D") {
			// mui-pullHint
			var pullHintCls = m_defaults.prefix + "-pullHint";
			var c = cont_.getElementsByClassName(pullHintCls)[0];
			if (c)
				jo_.appendTo(c);
			else
				jo_.prependTo(cont_);
		}
		else if (ac == "U") {
			jo_.appendTo(cont_);
		}
	}

	// ac为null时，应清除提示效果
	function updateHint(ac, dy)
	{
		if (ac == null || dy == 0 || (opt_.autoLoadMore && ac == 'U')) {
			ac = null;
		}
		else {
			dy = Math.abs(dy);
		}
		opt_.onHint.call(this, ac, dy, opt_.threshold);
	}

	function onAutoload(ev)
	{
		if ($(container).is(":visible")) {
			console.log("load more");
			opt_.onLoadItem.call(cont_, false);
		}
	}

	function checkScrollContainer(ev)
	{
		// 滚动条消失, 重新找scrollContainer
		if (scrollContainer_ && !canScroll(scrollContainer_)) {
			$(scrollContainer_).off("autoload", onAutoload);
			scrollContainer_ = null;
		}
		if (scrollContainer_ == null) {
			var o = cont_;
			while (o != null) {
				if (canScroll(o)) {
					scrollContainer_ = o;
					break;
				}
				o = o.parentElement;
			}
			if (scrollContainer_ && opt_.autoLoadMore) {
				$(scrollContainer_).on("autoload", onAutoload);
			}
		}
	}

	function touchStart(ev)
	{
		if (opt_.onPull && opt_.onPull(ev) === false) {
			ev.cancelPull_ = true;
			return;
		}

		checkScrollContainer();

		var p = getPos(ev);
		touchev_ = {
			ac: null,
			// 原始光标位置
			x0: p[0],
			y0: p[1],
			// 总移动位移
			dx: 0,
			dy: 0,
		};
		//ev.preventDefault(); // 防止click等事件无法触发
	}

	function mouseDown(ev)
	{
		mouseMoved_ = false;
		touchStart(ev);
		if (ev.cancelPull_ === true)
			return;
		// setCapture
		window.addEventListener("mousemove", mouseMove, true);
		window.addEventListener("mouseup", mouseUp, true);
		window.addEventListener("click", click, true);
	}

	// 防止拖动后误触发click事件
	function click(ev)
	{
		window.removeEventListener("click", click, true);
		if (mouseMoved_)
		{
			ev.stopPropagation();
			ev.preventDefault();
		}
	}

	function mouseMove(ev)
	{
		touchMove(ev);
		if (touchev_ == null)
			return;

		if (touchev_.dx != 0 || touchev_.dy != 0)
			mouseMoved_ = true;
		ev.stopPropagation();
		ev.preventDefault();
	}

	function mouseUp(ev)
	{
		touchEnd(ev);
		window.removeEventListener("mousemove", mouseMove, true);
		window.removeEventListener("mouseup", mouseUp, true);
		ev.stopPropagation();
		ev.preventDefault();
	}

	function touchMove(ev)
	{
		if (touchev_ == null)
			return;
		var p = getPos(ev);

		touchev_.dx = p[0] - touchev_.x0;
		touchev_.dy = p[1] - touchev_.y0;

		// 纵向移动。<0为上拉，>0为下拉
		var dy = touchev_.dy;

		// 如果不是竖直下拉，不处理
		if (Math.abs(touchev_.dx) > Math.abs(touchev_.dy)) {
			touchCancel();
			return;
		}
		// 非底部上拉，不做处理; 或自动加载更多时且外部有滚动条，不做处理
		if (dy < 0 && scrollContainer_ && (opt_.autoLoadMore || ! isScrollBottom(scrollContainer_))) {
			touchCancel();
			return;
		}
		// 非顶部下拉，不做处理
		if (dy > 0 && scrollContainer_ && scrollContainer_.scrollTop > 0) {
			touchCancel();
			return;
		}

		// 顶部下拉
		if (dy > 0 && cont_.scrollTop <= 0) {
			touchev_.ac = "D";
		}
		// 底部上拉
		else if (dy < 0 && isScrollBottom(cont_) ) {
			touchev_.ac = "U";
		}
		updateHint(touchev_.ac, dy);

		// 底部上拉显示上拉框
		if (touchev_.ac == "U" && scrollContainer_) {
			scrollToBottom(scrollContainer_);
		}
		ev.preventDefault();
	}

	function touchCancel(ev)
	{
		touchev_ = null;
		updateHint(null, 0);
	}

	function touchEnd(ev)
	{
		updateHint(null, 0);
		if (touchev_ == null || touchev_.ac == null || (Math.abs(touchev_.dy) < opt_.threshold && !(touchev_.ac == "U" && opt_.autoLoadMore)))
		{
			touchev_ = null;
			return;
		}
		console.log(touchev_);
		doAction(touchev_.ac);
		touchev_ = null;

		function doAction(ac)
		{
			// pulldown
			if (ac == "D") {
				console.log("refresh");
				opt_.onLoadItem.call(cont_, true);
			}
			else if (ac == "U") {
				console.log("load more");
				opt_.onLoadItem.call(cont_, false);
			}
		}
	}
}
}
jquery_pullList(window.jQuery);

