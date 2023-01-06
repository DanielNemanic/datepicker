import {datepickersMap, globalListenerData} from './constants'
import {InternalPickerData, UserEvent} from './types'
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
  // Only listen to focusin events on input elements.
  if (!getIsInput(e.target)) return

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
    internalPickerItem._navigate(true, {
      date: new Date(year, currentDate.getMonth(), 1),
      trigger: eventType,
      triggerType: 'user',
    })
  }

  publicPicker.toggleOverlay()
}

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
    const focusInListener = (e: FocusEvent) => {
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
    selectorData.el.addEventListener('focusin', focusInListener)
    listenersMap.set({type: 'focusin', el: selectorData.el}, focusInListener)
  }

  // ARROWS
  const {leftArrow, rightArrow} = controls
  const arrowListener = (e: MouseEvent) => {
    const isLeft = (e.currentTarget as HTMLDivElement).classList.contains(
      'dp-arrow-left'
    )
    const {currentDate} = internalPickerItem
    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + (isLeft ? -1 : 1),
      1
    )

    internalPickerItem._navigate(true, {
      date: newDate,
      trigger: 'click',
      triggerType: 'user',
    })
  }
  leftArrow.addEventListener('click', arrowListener)
  rightArrow.addEventListener('click', arrowListener)
  listenersMap.set({type: 'click', el: leftArrow}, arrowListener)
  listenersMap.set({type: 'click', el: rightArrow}, arrowListener)

  // MONTH/YEAR
  const {monthYearContainer} = controls
  monthYearContainer.addEventListener('click', publicPicker.toggleOverlay)
  listenersMap.set(
    {type: 'click', el: monthYearContainer},
    publicPicker.toggleOverlay
  )

  // DAYS
  const {daysContainer} = pickerElements
  const daysContainerListener = (e: MouseEvent) => {
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

    internalPickerItem._selectDate(true, {
      date,
      trigger: 'click',
      triggerType: 'user',
    })
  }
  daysContainer.addEventListener('click', daysContainerListener)
  listenersMap.set({type: 'click', el: daysContainer}, daysContainerListener)

  // OVERLAY MONTH
  const monthsContainerListener = (e: MouseEvent) => {
    const {isOverlayShowing} = internalPickerItem

    /*
      Disallow clicks while the overlay is closing, avoid clicks that aren't on
      the month.
    */
    if (!isOverlayShowing || e.target === e.currentTarget) {
      return
    }

    const monthNum = +((e.target as HTMLDivElement).dataset.num as string)
    const {currentDate} = publicPicker
    const currentMonth = currentDate.getMonth()

    // Only navigate if a different month has been clicked.
    if (monthNum !== currentMonth) {
      const date = new Date(currentDate.getFullYear(), monthNum, 1)
      internalPickerItem._navigate(true, {
        date,
        trigger: 'click',
        triggerType: 'user',
      })
    }

    // Close overlay.
    publicPicker.toggleOverlay()
  }
  overlayMonthsContainer.addEventListener('click', monthsContainerListener)
  listenersMap.set(
    {type: 'click', el: overlayMonthsContainer},
    monthsContainerListener
  )

  // OVERLAY CLOSE
  const overlayCloseListner = () => {
    if (internalPickerItem.isOverlayShowing) {
      publicPicker.toggleOverlay()
    }
  }
  overlayClose.addEventListener('click', overlayCloseListner)
  listenersMap.set({type: 'click', el: overlayClose}, overlayCloseListner)

  // OVERLAY SUBMIT
  const overlaySubmitListener = (e: MouseEvent) => {
    const {disabled} = e.currentTarget as HTMLButtonElement

    if (!disabled) {
      submitOverlayYear(internalPickerItem, 'click')
    }
  }
  overlaySubmitButton.addEventListener('click', overlaySubmitListener)
  listenersMap.set(
    {type: 'click', el: overlaySubmitButton},
    overlaySubmitListener
  )

  // OVERLAY INPUT
  const overlayInputOnInputListener = (e: InputEvent) => {
    const {overlaySubmitButton} = internalPickerItem.pickerElements.overlay
    const target = e.target as HTMLInputElement
    const {selectionStart} = target
    const newValue = target.value
      .split('')
      // Prevent leading 0's.
      .reduce((acc, char) => {
        if (!acc && char === '0') return ''
        return acc + (char.match(/[0-9]/) ? char : '')
      }, '')
      .slice(0, 4)

    target.value = newValue
    overlaySubmitButton.disabled = !newValue

    // https://stackoverflow.com/a/70549192/2525633 - maintain cursor position.
    target.setSelectionRange(selectionStart, selectionStart)
  }
  const overlayInputKeydownListener = (e: KeyboardEvent) => {
    // Fun fact: 275760 is the largest year for a JavaScript date. #TrialAndError
    // Also this - https://bit.ly/3Q5BsEF
    if (e.key === 'Enter') {
      submitOverlayYear(internalPickerItem, 'keydown')
    } else if (e.key === 'Escape') {
      publicPicker.toggleOverlay()
    }
  }
  // @ts-ignore - the event type *is* InputEvent - https://mzl.la/3jmtjzb
  overlayInput.addEventListener('input', overlayInputOnInputListener)
  overlayInput.addEventListener('keydown', overlayInputKeydownListener)
  listenersMap.set(
    {type: 'input', el: overlayInput},
    overlayInputOnInputListener
  )
  listenersMap.set(
    {type: 'keydown', el: overlayInput},
    overlayInputKeydownListener
  )
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