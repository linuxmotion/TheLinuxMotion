/* $Id */

/**
 * adsense_click.js - fires counter to log adsense clicks
 */
var lastStatus = '';

function adsense_click(e) {
  window.focus();
  if (window.status && (window.status != lastStatus)) {
    lastStatus = window.status;
    var img = new Image();
    img.src = window.location.protocol + '//' + window.location.host + '/adsense_click' +
      '?u=' + escape(document.location) +
      '&t=' + escape(document.title) +
      '&r=' + escape(document.referrer);
  }
}

var iframeObj;
var elements;
elements = document.getElementsByTagName("iframe");
for (var i = 0; i < elements.length; i++) {
  if(elements[i].src.indexOf('googlesyndication.com') > -1) {
    if (document.layers) {
      elements[i].captureEvents(Events.ONFOCUS);
    }
    elements[i].onfocus = adsense_click;
    iframeObj = elements[i];
  }
}

;
// $Id: dhtml_menu.js,v 1.49 2009/11/12 21:47:59 arancaytar Exp $



/**
 * @file dhtml_menu.js
 * The Javascript code for DHTML Menu
 */


(function($) {
Drupal.dhtmlMenu = {};
Drupal.dhtmlMenu.animation = {show:{}, hide:{}, count:0};

/**
 * Initialize the module's JS functions
 */
Drupal.behaviors.dhtmlMenu = {
  attach: function() {
    var settings = Drupal.settings.dhtmlMenu;

    // Initialize the animation effects from the settings.
    for (i in settings.animation.effects) {
      if (settings.animation.effects[i]) {
        Drupal.dhtmlMenu.animation.show[i] = 'show';
        Drupal.dhtmlMenu.animation.hide[i] = 'hide';
        Drupal.dhtmlMenu.animation.count++;
      }
    }

    // Sanitize by removing "expanded" on menus already marked "collapsed".
    $('li.dhtml-menu.collapsed.expanded').removeClass('expanded');

    /* Relevant only on "open-only" menus:
     * The links of expanded items should be marked for emphasis.
     */
    if (settings.nav == 'open') {
      $('li.dhtml-menu.expanded').addClass('dhtml-menu-open');
    }

    /* Relevant only when hovering:
     *
     * If a context menu is opened (as most users do when opening links in a
     * new tab), the mouseleave event will be triggered. Although the context
     * menu still works, having the menu close underneath it is confusing.
     *
     * This code will "freeze" the menu's collapse if the body is left
     * (which happens when a context menu opens), and only release it when the cursor
     * reenters the menu.
     *
     * Note that due to the order in which events are called,
     * the hovering collapse must work asynchronously so
     * this event is triggered before the collapse.
     */
    else if (settings.nav == 'hover') {
      var freeze = false;
      $('ul.menu').mouseenter(function() {freeze = false});
      $('body').mouseleave(function() {freeze = true});
    }

    /* Relevant only on bullet-icon expansion:
     * Create the markup for the bullet overlay, and the amount to shift it to the right in RTL mode.
     */
    else if (settings.nav == 'bullet') {
      var bullet = $('<a href="#" class="dhtml-menu-icon"></a>');
      var rtl = $('html').attr('dir') == 'rtl' ? Math.ceil($('.menu li').css('margin-right').replace('px', '')) + 1 : 0;
    }

    /* Relevant only when adding cloned links:
     * Create the markup for the cloned list item container.
     */
    else if (settings.nav == 'clone') {
      // Note: a single long class is used here to avoid matching the .dhtml-menu.leaf selector later on.
      var cloned = $('<li class="leaf dhtml-menu-cloned-leaf"></li>');
    }

    /* Add jQuery effects and listeners to all menu items. */
    $('ul.menu li.dhtml-menu:not(.leaf)').each(function() {
      var li = $(this);
      var link = $(this).find('a:first');
      var ul = $(this).find('ul:first');

      // Only work on menus with an actual sub-menu.
      if (link.length && ul.length) {
        /* When using cloned items:
         * - Clone the menu link and mark it as a clone.
         */
        if (settings.nav == 'clone') {
          link.clone().prependTo(ul).wrap(cloned);
        }

        /* When using double-click:
         * - Add a dblclick event handler that allows the normal link action to complete.
         */
        else if (settings.nav == 'doubleclick') {
          link.dblclick(function(e) {
            return true;
          });
        }

        /* When using bullet expansion:
         * - Change the icon to a folder image
         * - Add the clickable overlay and its handler
         * - In RTL mode, shift the overlay to the right of the text.
         * - @TODO: Explore whether "float:right" in dhtml_menu-rtl.css could solve this.
         */
        else if (settings.nav == 'bullet') {
          li.addClass('dhtml-folder');
          var b = bullet.clone().prependTo(link).click(function(e) {
            Drupal.dhtmlMenu.toggleMenu(li, link, ul);
            if (settings.effects.remember) {
              Drupal.dhtmlMenu.cookieSet();
            }
            return false;
          });

          // When using RTL, each overlay must be shifted to the other side of the link text, individually.
          if (rtl) {
            // Shift the overlay right by the width of the text and the distance between text and icon.
            b.css('right', '-' + (Math.ceil(link.css('width').replace('px', '')) + rtl) + 'px');
          }
        }

        /* When using hover expansion:
         * - Add mouse-hovering events.
         */
        else if (settings.nav == 'hover') {
          link.mouseenter(function(e) {
              Drupal.dhtmlMenu.switchMenu(li, link, ul, true);
          });
          li.mouseleave(function(e) {
            // Only collapse the menu if it was initially collapsed.
            if (li.hasClass('start-collapsed')) {
              /* As explained earlier, this event fires before the body event.
               * We need to wait to make sure that the user isn't browsing a
               * context menu right now, in which case the menu isn't collapsed.
               */
              setTimeout(function() {
                if (!freeze) {
                  Drupal.dhtmlMenu.switchMenu(li, link, ul, false);
                }
              }, 10);
            }
          });
        }

        /* When using menus that cannot collapse:
         * Toggle the menu normally, but only if the menu is closed.
         */
        else if (settings.nav == 'open') {
          link.click(function(e) {
            // Don't collapse expanded menus.
            if (li.hasClass('expanded')) {
              return true;
            }
            Drupal.dhtmlMenu.toggleMenu(li, link, ul);
            $('.dhtml-menu-open').removeClass('dhtml-menu-open');
            $('li.dhtml-menu.expanded').addClass('dhtml-menu-open');
            return false;
          });
        }

        // These three options make links simply toggle when clicked.
        if (settings.nav == 'clone' || settings.nav == 'doubleclick' || settings.nav == 'none') {
          link.click(function(e) {
            Drupal.dhtmlMenu.toggleMenu(li, link, ul);
            if (settings.effects.remember) {
              Drupal.dhtmlMenu.cookieSet();
            }
            return false;
          });
        }
      }
    });

    // When using LTR, all icons can be shifted as one, as the text width is not relevant.
    if (settings.nav == 'bullet' && !rtl) {
      // Shift overlay to the left by the width of the icon and the distance between icon and text.
      var shift = '-' + (Math.ceil(($('.menu li').css('margin-left').replace('px', ''))) + 16) + 'px';
      // Shift the overlay using a negative left-hand offset, and the text using a negative right-hand margin.
      $('.dhtml-menu-icon').css('left', shift).css('margin-right', shift);
    }
  }
}

/**
 * Toggles the menu's state between open and closed.
 *
 * @param li
 *   Object. The <li> element that will be expanded or collapsed.
 * @param link
 *   Object. The <a> element representing the menu link anchor.
 * @param ul
 *   Object. The <ul> element containing the sub-items.
 */
Drupal.dhtmlMenu.toggleMenu = function(li, link, ul) {
  // Make it open if closed, close if open.
  Drupal.dhtmlMenu.switchMenu(li, link, ul, !li.hasClass('expanded'));
}

/**
 * Switches the menu's state to a defined value.
 * This function does nothing if the menu is in the target state already.
 *
 * @param li
 *   Object. The <li> element that will be expanded or collapsed.
 * @param link
 *   Object. The <a> element representing the menu link anchor.
 * @param ul
 *   Object. The <ul> element containing the sub-items.
 */
Drupal.dhtmlMenu.switchMenu = function(li, link, ul, open) {
  // No need for switching. Menu is already in desired state.
  if (open == li.hasClass('expanded')) {
    return;
  }

  var effects = Drupal.settings.dhtmlMenu.effects;

  if (open) {
    Drupal.dhtmlMenu.animate(ul, 'show');
    li.removeClass('collapsed').addClass('expanded');

    // If the siblings effect is on, close all sibling menus.
    if (effects.siblings != 'none') {
      var id = li.attr('id');
      /* Siblings are all open menus that are neither parents nor children of this menu.
       * First, mark this item's children for exclusion.
       */
      li.find('li').addClass('own-children-temp');

      // If the relativity option is on, select only the siblings that have the same root
      if (effects.siblings == 'close-same-tree') {
        var root = li.parent();
      }
      else {
        var root = $('ul.menu');
      }
      var siblings = root.find('li.expanded').not('.own-children-temp').not('#' + id);

      // If children should not get closed automatically...
      if (effects.children == 'none') {
        // Remove items that are currently hidden from view (do not close these).
        $('li.collapsed li.expanded').addClass('sibling-children-temp');
        // Only close the top-most open sibling, not its children.
        siblings.find('li.expanded').addClass('sibling-children-temp');
        siblings = $(siblings).not('.sibling-children-temp');
      }

      // The temp classes can now be removed.
      $('.own-children-temp, .sibling-children-temp')
        .removeClass('own-children-temp')
        .removeClass('sibling-children-temp');

      Drupal.dhtmlMenu.animate(siblings.find('ul:first'), 'hide');
      siblings.removeClass('expanded').addClass('collapsed');
    }
  }
  else {
    Drupal.dhtmlMenu.animate(ul, 'hide');
    li.removeClass('expanded').addClass('collapsed');

    // If children are closed automatically, find and close them now.
    if (effects.children == 'close-children') {
      // If a sub-menu closes in the forest and nobody sees it, is animation a waste of performance? Yes.
      li.find('li.expanded')
        .removeClass('expanded').addClass('collapsed')
        .find('ul:first').css('display', 'none');
    }
  }
}

/**
 * Animate a specific block element using the configured DHTML effects.
 *
 * @param element
 *   The element to be animated. DHTML Menu only animates <ul> elements,
 *   but this could in theory be any block (not inline) element.
 *
 * @param action
 *   One of either 'show' or 'hide'.
 */
Drupal.dhtmlMenu.animate = function(element, action) {
  var effects = Drupal.dhtmlMenu.animation;
  var speed = Drupal.settings.dhtmlMenu.animation.speed;

  if (effects.count) {
    element.animate(effects[action], speed * 1);
  }
  else {
    element.css('display', action == 'show' ? 'block' : 'none');
  }
}

/**
 * Saves the dhtml_menu cookie.
 */
Drupal.dhtmlMenu.cookieSet = function() {
  var expanded = new Array();
  $('li.expanded').each(function() {
    expanded.push(this.id);
  });
  document.cookie = 'dhtml_menu=' + expanded.join(',') + ';path=/';
}

})(jQuery);

;
// $Id: textarea.js,v 1.31 2010/03/09 11:45:37 dries Exp $
(function ($) {

Drupal.behaviors.textarea = {
  attach: function (context, settings) {
    $('.form-textarea-wrapper.resizable', context).once('textarea', function () {
      var staticOffset = null;
      var textarea = $(this).addClass('resizable-textarea').find('textarea');
      var grippie = $('<div class="grippie"></div>').mousedown(startDrag);

      grippie.insertAfter(textarea);

      function startDrag(e) {
        staticOffset = textarea.height() - e.pageY;
        textarea.css('opacity', 0.25);
        $(document).mousemove(performDrag).mouseup(endDrag);
        return false;
      }

      function performDrag(e) {
        textarea.height(Math.max(32, staticOffset + e.pageY) + 'px');
        return false;
      }

      function endDrag(e) {
        $(document).unbind('mousemove', performDrag).unbind('mouseup', endDrag);
        textarea.css('opacity', 1);
      }
    });
  }
};

})(jQuery);
;
// $Id: text.js,v 1.5 2010/10/24 04:18:10 webchick Exp $

(function ($) {

/**
 * Auto-hide summary textarea if empty and show hide and unhide links.
 */
Drupal.behaviors.textSummary = {
  attach: function (context, settings) {
    $('.text-summary', context).once('text-summary', function () {
      var $widget = $(this).closest('div.field-type-text-with-summary');
      var $summaries = $widget.find('div.text-summary-wrapper');

      $summaries.once('text-summary-wrapper').each(function(index) {
        var $summary = $(this);
        var $summaryLabel = $summary.find('label');
        var $full = $widget.find('.text-full').eq(index).closest('.form-item');
        var $fullLabel = $full.find('label');

        // Create a placeholder label when the field cardinality is
        // unlimited or greater than 1.
        if ($fullLabel.length == 0) {
          $fullLabel = $('<label></label>').prependTo($full);
        }

        // Setup the edit/hide summary link.
        var $link = $('<span class="field-edit-link">(<a class="link-edit-summary" href="#">' + Drupal.t('Hide summary') + '</a>)</span>').toggle(
          function () {
            $summary.hide();
            $(this).find('a').html(Drupal.t('Edit summary')).end().appendTo($fullLabel);
            return false;
          },
          function () {
            $summary.show();
            $(this).find('a').html(Drupal.t('Hide summary')).end().appendTo($summaryLabel);
            return false;
          }
        ).appendTo($summaryLabel);

        // If no summary is set, hide the summary field.
        if ($(this).find('.text-summary').val() == '') {
          $link.click();
        }
        return;
      });
    });
  }
};

})(jQuery);
;
// $Id: filter.js,v 1.3 2010/09/13 00:59:47 dries Exp $
(function ($) {

/**
 * Automatically display the guidelines of the selected text format.
 */
Drupal.behaviors.filterGuidelines = {
  attach: function (context) {
    $('.filter-guidelines', context).once('filter-guidelines')
      .find(':header').hide()
      .parents('.filter-wrapper').find('select.filter-list')
      .bind('change', function () {
        $(this).parents('.filter-wrapper')
          .find('.filter-guidelines-item').hide()
          .siblings('.filter-guidelines-' + this.value).show();
      })
      .change();
  }
};

})(jQuery);
;
// $Id: collapse.js,v 1.32 2010/05/14 16:45:56 dries Exp $
(function ($) {

/**
 * Toggle the visibility of a fieldset using smooth animations.
 */
Drupal.toggleFieldset = function (fieldset) {
  var $fieldset = $(fieldset);
  if ($fieldset.is('.collapsed')) {
    var $content = $('> .fieldset-wrapper', fieldset).hide();
    $fieldset
      .removeClass('collapsed')
      .trigger({ type: 'collapsed', value: false })
      .find('> legend span.fieldset-legend-prefix').html(Drupal.t('Hide'));
    $content.slideDown({
      duration: 'fast',
      easing: 'linear',
      complete: function () {
        Drupal.collapseScrollIntoView(fieldset);
        fieldset.animating = false;
      },
      step: function () {
        // Scroll the fieldset into view.
        Drupal.collapseScrollIntoView(fieldset);
      }
    });
  }
  else {
    $fieldset.trigger({ type: 'collapsed', value: true });
    $('> .fieldset-wrapper', fieldset).slideUp('fast', function () {
      $fieldset
        .addClass('collapsed')
        .find('> legend span.fieldset-legend-prefix').html(Drupal.t('Show'));
      fieldset.animating = false;
    });
  }
};

/**
 * Scroll a given fieldset into view as much as possible.
 */
Drupal.collapseScrollIntoView = function (node) {
  var h = document.documentElement.clientHeight || document.body.clientHeight || 0;
  var offset = document.documentElement.scrollTop || document.body.scrollTop || 0;
  var posY = $(node).offset().top;
  var fudge = 55;
  if (posY + node.offsetHeight + fudge > h + offset) {
    if (node.offsetHeight > h) {
      window.scrollTo(0, posY);
    }
    else {
      window.scrollTo(0, posY + node.offsetHeight - h + fudge);
    }
  }
};

Drupal.behaviors.collapse = {
  attach: function (context, settings) {
    $('fieldset.collapsible', context).once('collapse', function () {
      var $fieldset = $(this);
      // Expand fieldset if there are errors inside, or if it contains an
      // element that is targeted by the uri fragment identifier. 
      var anchor = location.hash && location.hash != '#' ? ', ' + location.hash : '';
      if ($('.error' + anchor, $fieldset).length) {
        $fieldset.removeClass('collapsed');
      }

      var summary = $('<span class="summary"></span>');
      $fieldset.
        bind('summaryUpdated', function () {
          var text = $.trim($fieldset.drupalGetSummary());
          summary.html(text ? ' (' + text + ')' : '');
        })
        .trigger('summaryUpdated');

      // Turn the legend into a clickable link, but retain span.fieldset-legend
      // for CSS positioning.
      var $legend = $('> legend .fieldset-legend', this);

      $('<span class="fieldset-legend-prefix element-invisible"></span>')
        .append($fieldset.hasClass('collapsed') ? Drupal.t('Show') : Drupal.t('Hide'))
        .prependTo($legend)
        .after(' ');

      // .wrapInner() does not retain bound events.
      var $link = $('<a class="fieldset-title" href="#"></a>')
        .prepend($legend.contents())
        .appendTo($legend)
        .click(function () {
          var fieldset = $fieldset.get(0);
          // Don't animate multiple times.
          if (!fieldset.animating) {
            fieldset.animating = true;
            Drupal.toggleFieldset(fieldset);
          }
          return false;
        });

      $legend.append(summary);
    });
  }
};

})(jQuery);
;
// $Id: menu.js,v 1.7 2010/11/05 19:47:20 dries Exp $

(function ($) {

Drupal.behaviors.menuFieldsetSummaries = {
  attach: function (context) {
    $('fieldset.menu-link-form', context).drupalSetSummary(function (context) {
      if ($('.form-item-menu-enabled input', context).is(':checked')) {
        return Drupal.checkPlain($('.form-item-menu-link-title input', context).val());
      }
      else {
        return Drupal.t('Not in menu');
      }
    });
  }
};

/**
 * Automatically fill in a menu link title, if possible.
 */
Drupal.behaviors.menuLinkAutomaticTitle = {
  attach: function (context) {
    $('fieldset.menu-link-form', context).each(function () {
      // Try to find menu settings widget elements as well as a 'title' field in
      // the form, but play nicely with user permissions and form alterations.
      var $checkbox = $('.form-item-menu-enabled input', this);
      var $link_title = $('.form-item-menu-link-title input', context);
      var $title = $(this).closest('form').find('.form-item-title input');
      // Bail out if we do not have all required fields.
      if (!($checkbox.length && $link_title.length && $title.length)) {
        return;
      }
      // If there is a link title already, mark it as overridden. The user expects
      // that toggling the checkbox twice will take over the node's title.
      if ($checkbox.is(':checked') && $link_title.val().length) {
        $link_title.data('menuLinkAutomaticTitleOveridden', true);
      }
      // Whenever the value is changed manually, disable this behavior.
      $link_title.keyup(function () {
        $link_title.data('menuLinkAutomaticTitleOveridden', true);
      });
      // Global trigger on checkbox (do not fill-in a value when disabled).
      $checkbox.change(function () {
        if ($checkbox.is(':checked')) {
          if (!$link_title.data('menuLinkAutomaticTitleOveridden')) {
            $link_title.val($title.val());
          }
        }
        else {
          $link_title.val('');
          $link_title.removeData('menuLinkAutomaticTitleOveridden');
        }
        $checkbox.closest('fieldset.vertical-tabs-pane').trigger('summaryUpdated');
        $checkbox.trigger('formUpdated');
      });
      // Take over any title change.
      $title.keyup(function () {
        if (!$link_title.data('menuLinkAutomaticTitleOveridden') && $checkbox.is(':checked')) {
          $link_title.val($title.val());
          $link_title.val($title.val()).trigger('formUpdated');
        }
      });
    });
  }
};

})(jQuery);
;
// $Id: path.js,v 1.5 2010/11/05 19:47:20 dries Exp $

(function ($) {

Drupal.behaviors.pathFieldsetSummaries = {
  attach: function (context) {
    $('fieldset.path-form', context).drupalSetSummary(function (context) {
      var path = $('.form-item-path-alias input').val();

      return path ?
        Drupal.t('Alias: @alias', { '@alias': path }) :
        Drupal.t('No alias');
    });
  }
};

})(jQuery);
;
// $Id: comment-node-form.js,v 1.6 2010/11/05 19:47:20 dries Exp $

(function ($) {

Drupal.behaviors.commentFieldsetSummaries = {
  attach: function (context) {
    $('fieldset.comment-node-settings-form', context).drupalSetSummary(function (context) {
      return Drupal.checkPlain($('.form-item-comment input:checked', context).next('label').text());
    });

    // Provide the summary for the node type form.
    $('fieldset.comment-node-type-settings-form', context).drupalSetSummary(function(context) {
      var vals = [];

      // Default comment setting.
      vals.push($(".form-item-comment select option:selected", context).text());

      // Threading.
      var threading = $(".form-item-comment-default-mode input:checked", context).next('label').text();
      if (threading) {
        vals.push(threading);
      }

      // Comments per page.
      var number = $(".form-item-comment-default-per-page select option:selected", context).val();
      vals.push(Drupal.t('@number comments per page', {'@number': number}));

      return Drupal.checkPlain(vals.join(', '));
    });
  }
};

})(jQuery);
;
// $Id: autocomplete.js,v 1.39 2010/11/20 07:49:56 webchick Exp $
(function ($) {

/**
 * Attaches the autocomplete behavior to all required fields.
 */
Drupal.behaviors.autocomplete = {
  attach: function (context, settings) {
    var acdb = [];
    $('input.autocomplete', context).once('autocomplete', function () {
      var uri = this.value;
      if (!acdb[uri]) {
        acdb[uri] = new Drupal.ACDB(uri);
      }
      var $input = $('#' + this.id.substr(0, this.id.length - 13))
        .attr('autocomplete', 'OFF')
        .attr('aria-autocomplete', 'list');
      $($input[0].form).submit(Drupal.autocompleteSubmit);
      $input.parent()
        .attr('role', 'application')
        .append($('<span class="element-invisible" aria-live="assertive"></span>')
          .attr('id', $input.attr('id') + '-autocomplete-aria-live')
        );
      new Drupal.jsAC($input, acdb[uri]);
    });
  }
};

/**
 * Prevents the form from submitting if the suggestions popup is open
 * and closes the suggestions popup when doing so.
 */
Drupal.autocompleteSubmit = function () {
  return $('#autocomplete').each(function () {
    this.owner.hidePopup();
  }).size() == 0;
};

/**
 * An AutoComplete object.
 */
Drupal.jsAC = function ($input, db) {
  var ac = this;
  this.input = $input[0];
  this.ariaLive = $('#' + $input.attr('id') + '-autocomplete-aria-live');
  this.db = db;

  $input
    .keydown(function (event) { return ac.onkeydown(this, event); })
    .keyup(function (event) { ac.onkeyup(this, event); })
    .blur(function () { ac.hidePopup(); ac.db.cancel(); });

};

/**
 * Handler for the "keydown" event.
 */
Drupal.jsAC.prototype.onkeydown = function (input, e) {
  if (!e) {
    e = window.event;
  }
  switch (e.keyCode) {
    case 40: // down arrow.
      this.selectDown();
      return false;
    case 38: // up arrow.
      this.selectUp();
      return false;
    default: // All other keys.
      return true;
  }
};

/**
 * Handler for the "keyup" event.
 */
Drupal.jsAC.prototype.onkeyup = function (input, e) {
  if (!e) {
    e = window.event;
  }
  switch (e.keyCode) {
    case 16: // Shift.
    case 17: // Ctrl.
    case 18: // Alt.
    case 20: // Caps lock.
    case 33: // Page up.
    case 34: // Page down.
    case 35: // End.
    case 36: // Home.
    case 37: // Left arrow.
    case 38: // Up arrow.
    case 39: // Right arrow.
    case 40: // Down arrow.
      return true;

    case 9:  // Tab.
    case 13: // Enter.
    case 27: // Esc.
      this.hidePopup(e.keyCode);
      return true;

    default: // All other keys.
      if (input.value.length > 0)
        this.populatePopup();
      else
        this.hidePopup(e.keyCode);
      return true;
  }
};

/**
 * Puts the currently highlighted suggestion into the autocomplete field.
 */
Drupal.jsAC.prototype.select = function (node) {
  this.input.value = $(node).data('autocompleteValue');
};

/**
 * Highlights the next suggestion.
 */
Drupal.jsAC.prototype.selectDown = function () {
  if (this.selected && this.selected.nextSibling) {
    this.highlight(this.selected.nextSibling);
  }
  else if (this.popup) {
    var lis = $('li', this.popup);
    if (lis.size() > 0) {
      this.highlight(lis.get(0));
    }
  }
};

/**
 * Highlights the previous suggestion.
 */
Drupal.jsAC.prototype.selectUp = function () {
  if (this.selected && this.selected.previousSibling) {
    this.highlight(this.selected.previousSibling);
  }
};

/**
 * Highlights a suggestion.
 */
Drupal.jsAC.prototype.highlight = function (node) {
  if (this.selected) {
    $(this.selected).removeClass('selected');
  }
  $(node).addClass('selected');
  this.selected = node;
  $(this.ariaLive).html($(this.selected).html());
};

/**
 * Unhighlights a suggestion.
 */
Drupal.jsAC.prototype.unhighlight = function (node) {
  $(node).removeClass('selected');
  this.selected = false;
  $(this.ariaLive).empty();
};

/**
 * Hides the autocomplete suggestions.
 */
Drupal.jsAC.prototype.hidePopup = function (keycode) {
  // Select item if the right key or mousebutton was pressed.
  if (this.selected && ((keycode && keycode != 46 && keycode != 8 && keycode != 27) || !keycode)) {
    this.input.value = $(this.selected).data('autocompleteValue');
  }
  // Hide popup.
  var popup = this.popup;
  if (popup) {
    this.popup = null;
    $(popup).fadeOut('fast', function () { $(popup).remove(); });
  }
  this.selected = false;
  $(this.ariaLive).empty();
};

/**
 * Positions the suggestions popup and starts a search.
 */
Drupal.jsAC.prototype.populatePopup = function () {
  var $input = $(this.input);
  var position = $input.position();
  // Show popup.
  if (this.popup) {
    $(this.popup).remove();
  }
  this.selected = false;
  this.popup = $('<div id="autocomplete"></div>')[0];
  this.popup.owner = this;
  $(this.popup).css({
    top: parseInt(position.top + this.input.offsetHeight, 10) + 'px',
    left: parseInt(position.left, 10) + 'px',
    width: $input.innerWidth() + 'px',
    display: 'none'
  });
  $input.before(this.popup);

  // Do search.
  this.db.owner = this;
  this.db.search(this.input.value);
};

/**
 * Fills the suggestion popup with any matches received.
 */
Drupal.jsAC.prototype.found = function (matches) {
  // If no value in the textfield, do not show the popup.
  if (!this.input.value.length) {
    return false;
  }

  // Prepare matches.
  var ul = $('<ul></ul>');
  var ac = this;
  for (key in matches) {
    $('<li></li>')
      .html($('<div></div>').html(matches[key]))
      .mousedown(function () { ac.select(this); })
      .mouseover(function () { ac.highlight(this); })
      .mouseout(function () { ac.unhighlight(this); })
      .data('autocompleteValue', key)
      .appendTo(ul);
  }

  // Show popup with matches, if any.
  if (this.popup) {
    if (ul.children().size()) {
      $(this.popup).empty().append(ul).show();
      $(this.ariaLive).html(Drupal.t('Autocomplete popup'));
    }
    else {
      $(this.popup).css({ visibility: 'hidden' });
      this.hidePopup();
    }
  }
};

Drupal.jsAC.prototype.setStatus = function (status) {
  switch (status) {
    case 'begin':
      $(this.input).addClass('throbbing');
      $(this.ariaLive).html(Drupal.t('Searching for matches...'));
      break;
    case 'cancel':
    case 'error':
    case 'found':
      $(this.input).removeClass('throbbing');
      break;
  }
};

/**
 * An AutoComplete DataBase object.
 */
Drupal.ACDB = function (uri) {
  this.uri = uri;
  this.delay = 300;
  this.cache = {};
};

/**
 * Performs a cached and delayed search.
 */
Drupal.ACDB.prototype.search = function (searchString) {
  var db = this;
  this.searchString = searchString;

  // See if this string needs to be searched for anyway.
  searchString = searchString.replace(/^\s+|\s+$/, '');
  if (searchString.length <= 0 ||
    searchString.charAt(searchString.length - 1) == ',') {
    return;
  }

  // See if this key has been searched for before.
  if (this.cache[searchString]) {
    return this.owner.found(this.cache[searchString]);
  }

  // Initiate delayed search.
  if (this.timer) {
    clearTimeout(this.timer);
  }
  this.timer = setTimeout(function () {
    db.owner.setStatus('begin');

    // Ajax GET request for autocompletion.
    $.ajax({
      type: 'GET',
      url: db.uri + '/' + encodeURIComponent(searchString),
      dataType: 'json',
      success: function (matches) {
        if (typeof matches.status == 'undefined' || matches.status != 0) {
          db.cache[searchString] = matches;
          // Verify if these are still the matches the user wants to see.
          if (db.searchString == searchString) {
            db.owner.found(matches);
          }
          db.owner.setStatus('found');
        }
      },
      error: function (xmlhttp) {
        alert(Drupal.ajaxError(xmlhttp, db.uri));
      }
    });
  }, this.delay);
};

/**
 * Cancels the current autocomplete request.
 */
Drupal.ACDB.prototype.cancel = function () {
  if (this.owner) this.owner.setStatus('cancel');
  if (this.timer) clearTimeout(this.timer);
  this.searchString = '';
};

})(jQuery);
;
// $Id: node.js,v 1.8 2010/12/15 03:42:25 webchick Exp $

(function ($) {

Drupal.behaviors.nodeFieldsetSummaries = {
  attach: function (context) {
    $('fieldset.node-form-revision-information', context).drupalSetSummary(function (context) {
      var revisionCheckbox = $('.form-item-revision input', context);

      // Return 'New revision' if the 'Create new revision' checkbox is checked,
      // or if the checkbox doesn't exist, but the revision log does. For users
      // without the "Administer content" permission the checkbox won't appear,
      // but the revision log will if the content type is set to auto-revision.
      if (revisionCheckbox.is(':checked') || (!revisionCheckbox.length && $('.form-item-log textarea', context).length)) {
        return Drupal.t('New revision');
      }

      return Drupal.t('No revision');
    });

    $('fieldset.node-form-author', context).drupalSetSummary(function (context) {
      var name = $('.form-item-name input', context).val() || Drupal.settings.anonymous,
        date = $('.form-item-date input', context).val();
      return date ?
        Drupal.t('By @name on @date', { '@name': name, '@date': date }) :
        Drupal.t('By @name', { '@name': name });
    });

    $('fieldset.node-form-options', context).drupalSetSummary(function (context) {
      var vals = [];

      $('input:checked', context).parent().each(function () {
        vals.push(Drupal.checkPlain($.trim($(this).text())));
      });

      if (!$('.form-item-status input', context).is(':checked')) {
        vals.unshift(Drupal.t('Not published'));
      }
      return vals.join(', ');
    });
  }
};

})(jQuery);
;
