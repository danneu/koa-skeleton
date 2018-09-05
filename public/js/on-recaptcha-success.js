var $btn = document.querySelector('button.g-recaptcha')
var $form = findParent($btn, 'form')

function findParent(node, selector) {
    while ((node = node.parentElement) && !node.matches(selector)) {}
    return node
}

// Defines global onRecaptchaSuccess callback for use
// on pages with recaptcha.
window.onRecaptchaSuccess = function() {
    $form.submit()
}

// Prevent double-submit

$btn.addEventListener('click', function(e) {
    $btn.textContent = 'Submitting...'
    $btn.disabled = true
})
