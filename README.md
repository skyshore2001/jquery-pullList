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