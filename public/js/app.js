
/*
   This file is a junk drawer of our custom js. It's loaded after vendored
   javascript but before any template-specific js.
 */

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
