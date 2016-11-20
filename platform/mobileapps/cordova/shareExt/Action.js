var Action = function() {};

Action.prototype = {
    
run: function(parameters) {
    parameters.completionFunction({"url": document.URL });
},
    
finalize: function(parameters) {
    
}
    
};

var ExtensionPreprocessingJS = new Action
