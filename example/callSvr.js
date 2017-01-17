/*
@fn callSvr(ac, param?, fn?)

模拟远程调用: 返回列表，每页默认20条数据（可由pagesz参数控制）

原型：

	getOrderList(pagekey?=1, pagesz?=20) => { nextkey?, @list={id, name} }, 最后一页没有nextkey属性。

例：

	callSvr("getOrderList") => { nextkey: 2, list=[ {id:1, name: "item 1"} ,...] }
	callSvr("getOrderList", {pagekey:2}) => { nextkey: 3, list=[ {id:11, name: "item 11"} ,...] }
	callSvr("getOrderList", {pagekey:8}) => { list=[ {id:71, name: "item 71"} ,...] }

*/
function callSvr(ac, param, fn)
{
	var total = 73; // 模拟总数据条数
	var delay = 1000; // 模拟调用时间
	var opt_ = $.extend({pagekey: 1, pagesz: 20}, param);
	if (fn == null) fn = console.log;

	console.log("request page: " + opt_.pagekey);
	$("#prompt").show();

	setTimeout(function () {
		var ret = {nextkey: opt_.pagekey+1, list: []};
		var i, n=0;
		for (i=(opt_.pagekey-1)*opt_.pagesz; i<total && n<opt_.pagesz; ++i, ++n) {
			var id = i+1;
			ret.list.push({
				id: id,
				name: "item " + id
			});
		}
		if (n < opt_.pagesz)
			delete ret.nextkey;
		fn(ret);
		$("#prompt").hide();
	}, delay);
}

