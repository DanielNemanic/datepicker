import {datepickersMap, globalListenerData} from './constants'
import {
  InternalPickerData,
  ListenersMapKey,
  ListenersMapValue,
  UserEvent,
} from './types'
import {getIsInput} from './utils'

function globalListener(e: Event) {
  let found = false

  datepickersMap.forEach((pickerSet, el) => {
    if (el.contains(e.target as HTMLInputElement)) {
      found = true
    }
  })

  // Hide all other calendars.
  if (!found) {
    const type = e.type as UserEvent

    datepickersMap.forEach(pickerSet => {
      pickerSet.forEach(picker => {
        picker._hide({trigger: type, triggerType: 'user'})
      })
    })
  }
}

function globalInputFocusInListener(e: FocusEvent): void {
  /**
   * Only listen to focusin events on input elements.
   * Don't trigger listener for events on the overlay input.
   */
  if (!getIsInput(e.target) || e.target.className === 'dp-overlay-input') {
    return
  }

  // TODO - why do we pass a focus event to a click event listener?
  globalListener(e)
}

function submitOverlayYear(
  internalPickerItem: InternalPickerData,
  eventType: 'click' | 'keydown'
) {
  const {publicPicker, pickerElements} = internalPickerItem
  const {overlay} = pickerElements
  const overlayInput = overlay.input
  const {currentDate} = publicPicker

  if (!overlayInput.value) {
    return
  }

  const year = Number(overlayInput.value)

  // If the same year is entered, simply close the overlay.
  if (year !== currentDate.getFullYear()) {
    internalPickerItem._navigate({
      date: new Date(year, currentDate.getMonth(), 1),
      trigger: eventType,
      triggerType: 'user',
    })
  }

  publicPicker.toggleOverlay()
}

/**
 * The event listener callback functions do NOT mutate the picker objects. All
 * they do is call the appropriate picker methods with relevant data.
 *
 * `overlayInputOnInputListener` updates the overlay input field's value.
 */
export function addEventListeners(internalPickerItem: InternalPickerData) {
  const {listenersMap, pickerElements, selectorData, publicPicker} =
    internalPickerItem
  const {controls, overlay} = pickerElements
  const {
    overlayMonthsContainer,
    overlayClose,
    overlaySubmitButton,
    input: overlayInput,
  } = overlay
  const isInput = getIsInput(selectorData.el)

  function setListenersMapItem(
    {type, el}: ListenersMapKey,
    listener: ListenersMapValue
  ) {
    el.addEventListener(type, listener)
    listenersMap.set({type, el}, listener)
  }

  // GLOBAL LISTENERS
  if (!globalListenerData.attached) {
    document.addEventListener('focusin', globalInputFocusInListener)
    document.addEventListener('click', globalListener)
    globalListenerData.attached = true
  }

  // INPUT ELEMENT
  if (isInput) {
    const showHideData = {trigger: 'focusin', triggerType: 'user'} as const

    // `focusin` bubbles, `focus` does not.
    setListenersMapItem({type: 'focusin', el: selectorData.el}, focusInListener)
    function focusInListener(e: FocusEvent) {
      // Show this calendar.
      internalPickerItem._show(showHideData)

      // Hide all other calendars.
      datepickersMap.forEach(pickerSet => {
        pickerSet.forEach(picker => {
          if (picker !== internalPickerItem && !picker.alwaysShow) {
            picker.publicPicker.hide()
            picker._hide(showHideData)
          }
        })
      })
    }
  }

  // ARROWS
  const {leftArrow, rightArrow} = controls
  setListenersMapItem({type: 'click', el: leftArrow}, arrowListener)
  setListenersMapItem({type: 'click', el: rightArrow}, arrowListener)
  function arrowListener(e: MouseEvent) {
    const isLeft = (e.currentTarget as HTMLDivElement).classList.contains(
      'dp-arrow-left'
    )
    const {currentDate} = internalPickerItem
    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + (isLeft ? -1 : 1),
      1
    )

    internalPickerItem._navigate({
      date: newDate,
      trigger: 'click',
      triggerType: 'user',
    })
  }

  // MONTH/YEAR
  const {monthYearContainer} = controls
  setListenersMapItem(
    {type: 'click', el: monthYearContainer},
    publicPicker.toggleOverlay
  )

  // DAYS
  const {daysContainer} = pickerElements
  setListenersMapItem({type: 'click', el: daysContainer}, daysContainerListener)
  function daysContainerListener(e: MouseEvent) {
    const {target} = e
    const currentTarget = e.currentTarget as HTMLDivElement
    const {classList, textContent} = target as HTMLDivElement

    // Do nothing for clicks on empty or disabled days.
    if (currentTarget === e.target || classList.contains('dp-disabled-date')) {
      return
    }

    // Select / de-select a day.
    const dayNum = Number(textContent as string)
    let date: Date | undefined
    if (!classList.contains('dp-selected-date')) {
      const {currentDate} = publicPicker
      date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum)
    }

    internalPickerItem._selectDate({
      date,
      trigger: 'click',
      triggerType: 'user',
      // No navigation needed when the user is clicking a date on the current calendar.
      // changeCalendar: false,
    })
  }

  // OVERLAY MONTH
  setListenersMapItem(
    {type: 'click', el: overlayMonthsContainer},
    monthsContainerListener
  )
  function monthsContainerListener(e: MouseEvent) {
    const {isOverlayShowing} = internalPickerItem

    /*
      Disallow clicks while the overlay is closing, avoid clicks that aren't on
      the month.
    */
    if (!isOverlayShowing || e.target === e.currentTarget) {
      return
    }

    // TODO - consistent code - Number(...) or +(...)
    const monthNum = +((e.target as HTMLDivElement).dataset.num as string)
    const {currentDate} = publicPicker

    // Only navigate if a different month has been clicked.
    if (monthNum !== currentDate.getMonth()) {
      const date = new Date(currentDate.getFullYear(), monthNum, 1)
      internalPickerItem._navigate({
        date,
        trigger: 'click',
        triggerType: 'user',
      })
    }

    // Close overlay.
    publicPicker.toggleOverlay()
  }

  // OVERLAY CLOSE
  setListenersMapItem({type: 'click', el: overlayClose}, overlayCloseListner)
  function overlayCloseListner() {
    if (internalPickerItem.isOverlayShowing) {
      publicPicker.toggleOverlay()
    }
  }

  // OVERLAY SUBMIT
  setListenersMapItem(
    {type: 'click', el: overlaySubmitButton},
    overlaySubmitListener
  )
  function overlaySubmitListener(e: MouseEvent) {
    const {disabled} = e.currentTarget as HTMLButtonElement

    if (!disabled) {
      submitOverlayYear(internalPickerItem, 'click')
    }
  }

  // OVERLAY INPUT
  setListenersMapItem(
    {type: 'input', el: overlayInput},
    overlayInputOnInputListener
  )
  function overlayInputOnInputListener(e: InputEvent) {
    const {overlaySubmitButton} = internalPickerItem.pickerElements.overlay
    const {selectionStart} = overlayInput
    const newValue = overlayInput.value
      .split('')
      // Prevent leading 0's.
      .reduce((acc, char) => {
        if (!acc && char === '0') return ''
        return acc + (char.match(/[0-9]/) ? char : '')
      }, '')
      .slice(0, 4)

    overlayInput.value = newValue
    overlaySubmitButton.disabled = !newValue

    // https://stackoverflow.com/a/70549192/2525633 - maintain cursor position.
    overlayInput.setSelectionRange(selectionStart, selectionStart)
  }
  setListenersMapItem(
    {type: 'keydown', el: overlayInput},
    overlayInputKeydownListener
  )
  function overlayInputKeydownListener(e: KeyboardEvent) {
    // Fun fact: 275760 is the largest year for a JavaScript date. #TrialAndError
    // Also this - https://bit.ly/3Q5BsEF
    if (e.key === 'Enter') {
      submitOverlayYear(internalPickerItem, 'keydown')
    } else if (e.key === 'Escape') {
      publicPicker.toggleOverlay()
    }
  }
}

export function removeEventListeners(internalPickerItem: InternalPickerData) {
  const {listenersMap} = internalPickerItem

  if (datepickersMap.size === 0) {
    document.removeEventListener('focusin', globalInputFocusInListener)
    document.removeEventListener('click', globalListener)
    globalListenerData.attached = false
  }

  listenersMap.forEach((listener, {type, el}) => {
    el.removeEventListener(type, listener)
  })
}
