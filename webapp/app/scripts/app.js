var editor = new wysihtml5.Editor("wysihtml5-editor", {
	toolbar: "wysihtml5-editor-toolbar",
	parserRules: wysihtml5ParserRules
});

editor.on("load", function() {
	var composer = editor.composer,
	    h1 = editor.composer.element.querySelector("h1");
	if (h1) {
	  composer.selection.selectNode(h1);
	}
});