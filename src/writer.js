var Application = require("substance-application");
var Component = Application.Component;
var $$ = Application.$$;
var _ = require("underscore");

// Static sub components
var ContentTools = require("./content_tools");
var ContentPanel = require("./content_panel");


// The Writer Component
// ----------------

var Writer = function(props) {
  Component.call(this, props);

  // A bucket for panel-related data
  this.panelData = {};
};

Writer.Prototype = function() {

  // Utils
  // ----------------

  // Get all available tools from extensions
  this.getTools = function() {
    var extensions = this.props.config.extensions;
    var tools = [];

    for (var i = 0; i < extensions.length; i++) {
      var ext = extensions[i];
      if (ext.tools) {
        tools = tools.concat(ext.tools);
      }
    }
    return tools;
  };

  this.getReferenceHandlers = function() {
    var extensions = this.props.config.extensions;
    var refHandlers = [];

    for (var i = 0; i < extensions.length; i++) {
      var ext = extensions[i];
      if (ext.referenceHandler) {
        refHandlers.push(ext.referenceHandler)
      }
    }

    return refHandlers;
  };

  this.getPanels = function() {
    var extensions = this.props.config.extensions;
    var panels = [];

    for (var i = 0; i < extensions.length; i++) {
      var ext = extensions[i];
      panels = panels.concat(ext.panels);
    }
    return panels;
  };


  // Routing
  // ----------------

  this.stateToRoute = function() {
    return this.state;
  };

  this.stateFromRoute = function(compRoute) {
    return this.compRoute;
  };

  // Events
  // ----------------

  this.componentDidMount = function() {
    $(this.el).on('click', 'a.toggle-context', _.bind(this._toggleContext, this));

    // This should go into the extension
    $(this.el).on('click', '.annotation', _.bind(this._toggleReference, this));
  };

  this._toggleContext = function(e) {
    var newContext = $(e.currentTarget).attr("data-id");
    this.setState({
      contextId: newContext
    });
    e.preventDefault();
  };

  this._toggleReference = function(e) {
    e.preventDefault();
    var referenceId = $(e.currentTarget).attr("data-id");
    var reference = this.props.doc.get(referenceId);
    var newState = null;

    var refHandlers = this.getReferenceHandlers();
    for (var i = 0; i < refHandlers.length && !newState; i++) {
      var handler = refHandlers[i];
      newState = handler(this, reference);
    };

    console.log('toggle reference', newState);
    if (newState) {
      this.setState(newState);
    } else {
      console.error("this reference type could not be handled:", reference.type);
    }
  };

  // Tools and panels can request context switches on writer level
  // E.g. when a new a new entity should be tagged we would go into the state
  // contextId: "tagentity"
  this.handleContextSwitch = function(contextId) {
    this.setState({
      contextId: contextId
    });
  };


  // State transition stuff
  // ----------------

  this.getInitialState = function() {
    return {"contextId": "entities"};
  };

  // TODO: use getPanels() helper
  // this.transition = function(oldState, newState, cb) {
  //   var extensions = this.props.config.extensions;
  //   var handled = false;

  //   for (var i = 0; i < extensions.length && !handled; i++) {
  //     var extension = extensions[i];
  //     var transitions = extension.transitions;

  //     // this.handleWriterTransition
  //     for (var j = 0; j < transitions.length && !handled; j++) {
  //       var transition = transitions[j];
  //       handled = transition(this, oldState, newState, cb);
  //       // if (handled) {
  //       //   console.log('transition handled by', extension.name, 'extension:', transition);
  //       // }
  //     }
  //   }

  //   if (!handled) {
  //     cb(null);
  //   }
  // };

  // Rendering
  // ----------------

  this.createContextToggles = function() {
    var panels = this.getPanels();
    var contextId = this.state.contextId;

    var panelComps = panels.map(function(panelClass) {
      // We don't show dialogs here
      if (panelClass.isDialog) return null;

      var className = ["toggle-context"];
      if (panelClass.contextId === contextId) {
        className.push("active");
      }

      return $$('a', {
        className: className.join(" "),
        href: "#",
        "data-id": panelClass.contextId,
        html: '<i class="fa '+panelClass.icon+'"></i> '+panelClass.panelName
      });
    });

    return $$('div', {className: "context-toggles"},
      _.compact(panelComps)
    );
  };

  // Create a new panel based on current state
  // ----------------

  this.createContextPanel = function() {
    var panels = this.getPanels();
    var contextId = this.state.contextId;
    var panelClass = null;

    for (var i = 0; i < panels.length && !panelClass; i++) {
      var panel = panels[i];
      if (contextId === panel.contextId) {
        panelClass = panel;
      }
    }

    if (!panelClass) {
      throw new Error("No panel found for ", contextId);
    }

    // Let the panel create an element, where props are derived from
    // writer state
    return panelClass.create(this);
  };

  this.render = function() {
    return $$('div', {className: 'writer-component'},
      $$('div', {className: "main-container"},
        $$(ContentTools, { // will be reused
          writer: this,
          doc: this.props.doc,
          id: "content-tools",
          switchContext: _.bind(this.handleContextSwitch, this)
        }),
        $$(ContentPanel, {
          writer: this,
          doc: this.props.doc,
          id: 'content-panel'
        })
      ),
      $$('div', {className: "resource-container"},
        this.createContextToggles(),
        this.createContextPanel(this) // will be possibly recycled
      )
    );
  };
};

Writer.Prototype.prototype = Component.prototype;
Writer.prototype = new Writer.Prototype();

module.exports = Writer;