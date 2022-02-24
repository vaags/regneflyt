export function fakeInputFocus(fakeInput: HTMLInputElement) {
	// Hack to get Safari / Ios to focus
	// create invisible dummy input to receive the focus first
	// Ref: https://stackoverflow.com/a/45703019
	if (!fakeInput) {
		fakeInput = document.createElement('input')
		fakeInput.setAttribute('type', 'number')
		fakeInput.style.position = 'absolute'
		fakeInput.style.opacity = '0'
		fakeInput.style.height = '0'
		fakeInput.style.fontSize = '16px' // disable auto zoom

		// you may need to append to another element depending on the browser's auto
		// zoom/scroll behavior
		document.body.prepend(fakeInput)
	}

	fakeInput.focus()
}
