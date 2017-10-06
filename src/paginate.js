// 3rd
const debug = require('debug')('app:paginate')
const assert = require('better-assert')
// 1st
const config = require('./config')

// TODO: Clean this mess up
//
// Returns falsey if no paginator needs to be displayed
// or it returns a paginator object that can be passed into the
// renderPaginator macro
exports.makePaginator = function(currPage, totalItems) {
  assert(Number.isInteger(currPage))
  assert(Number.isInteger(totalItems))
  const perPage = config.MESSAGES_PER_PAGE
  assert(Number.isInteger(perPage))

  const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
  currPage = Math.min(currPage, totalPages)

  if (currPage === 1 && totalPages === 1) {
    return null
  }

  let innerItems = []
  let startPgNum = Math.max(1, currPage - 3)
  let endPgNum = Math.min(totalPages, startPgNum + 6)

  if (currPage > 1) {
    innerItems.push({
      text: 'Prev',
      href: `?page=${currPage - 1}`,
      kind: 'BUTTON',
    })
  }

  if (startPgNum > 1) {
    innerItems.push({ text: '1', href: `?page=1`, kind: 'BUTTON' })
  }

  if (startPgNum > 2) {
    innerItems.push({ kind: 'SEPARATOR' })
  }

  for (let n = startPgNum; n <= endPgNum; n++) {
    const btn = {
      text: n.toString(),
      href: `?page=${n}`,
      isActive: n === currPage,
      kind: 'BUTTON',
    }
    innerItems.push(btn)
  }

  if (endPgNum < totalPages - 1) {
    innerItems.push({ kind: 'SEPARATOR' })
  }

  if (endPgNum < totalPages) {
    innerItems.push({
      text: totalPages.toString(),
      href: `?page=${totalPages.toString()}`,
      kind: 'BUTTON',
    })
  }

  if (currPage < totalPages) {
    innerItems.push({
      text: 'Next',
      href: `?page=${currPage + 1}`,
      kind: 'BUTTON',
    })
  }

  return innerItems
}
