(function($, window){

    $.fn.sunlight = function(options) {
        var highlighter = new window.Sunlight.Highlighter(options);
        this.each(function() {
            highlighter.highlightNode(this);
        });

        return this;
    };

}(jQuery, this));