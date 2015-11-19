
/*
   This file is a junk drawer of our custom js. It's loaded after vendored
   javascript but before any template-specific js.
 */

////////////////////////////////////////////////////////////
// $.timeago
////////////////////////////////////////////////////////////

// Configure timeago and initialize it for any <abbr> tag with the 
// 'timeago' class.

$.timeago.settings.strings = {
  prefixAgo: null,
  prefixFromNow: "in",
  suffixAgo: "ago",
  suffixFromNow: "",
  seconds: "<1 min",
  minute: "1 min",
  minutes: "%d min",
  hour: "1 hour",
  hours: "%d hours",
  day: "1 day",
  days: "%d days",
  month: "1 month",
  months: "%d months",
  year: "1 year",
  years: "%d years",
  wordSeparator: " ",
  numbers: []
};

$("abbr.timeago").timeago();

////////////////////////////////////////////////////////////
// Custom jQuery methods
////////////////////////////////////////////////////////////

// $.fn.focusEnd()
//
// Create jQuery method $('input').focusEnd() that
// focuses the input but also places cursor at the end of the value.
//
// if input[type="text"], sets cursor to end of input
// if textarea, sets cursor to end and also scrolls to end of input
// else just does regular focus
//
// Why? The default .focus() behavior puts the cursor before
// the value which I don't like.

(function($){
  $.fn.focusEnd = function() {
    $(this).focus();
    if ($(this).attr('type') === 'text') {
      $(this).val($(this).val());
    } else if ($(this).prop('tagName').toLowerCase() === 'textarea') {
      var orig = $(this).val();
      $(this).val('').val(orig);
      $(this).scrollTop($(this).get(0).scrollHeight - $(this).height());
    }
    return this;
  }; 
})(jQuery);

// $.fn.counter()
//
// define jQuery .counter() method to make it easy to link up an
// input with a counter that updates as the user types in input.

(function($) {
  $.fn.counter = function(counterSelector, min, max) {
    var $counter = $(counterSelector);
    var $input = $(this);

    // build counter dom
    var html = '' +
      '<span class="__counter-container">' +
      '  <span class="__counter-value">0</span>/' + max.toString() +
      '</span>';
    $counter.html(html);

    // create updater function
    var updateCounter = makeUpdateCounter($input, $counter, min, max);

    $input.on('change keyup', updateCounter);
    updateCounter();

    return this;
  };

  // Helpers

  function makeUpdateCounter($input, $counter, min, max) {
    // track whether user has touched the input so that we only enter
    // error state on min-constraint if user has touched the input 
    // because we don't want to overwhelm user with red errors on page load
    // just because all the inputs are empty
    var isDirty = false;

    return function updateCounter() {
      if ($input.val().length > 0) {
        isDirty = true;
      }
      var count = $input.val().length;
      $counter.find('.__counter-value').text(count);
      if (count > max || (count < min && isDirty)) {
        $counter.find('.__counter-container').css('color', '#e74c3c');
      } else {
        $counter.find('.__counter-container').css('color', '#777');
      }
    };
  }
})(jQuery);
