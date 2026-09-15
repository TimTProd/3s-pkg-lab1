const ColorView = (() => {
    const rows = Array.from(document.querySelectorAll('.component'))
    const palettes = Array.from(document.querySelectorAll('.palette'))
    const lighting = document.querySelector('#lighting')

    function render(values, hex, message, activeInput = null) {
        rows.forEach(row => {
            let model = row.closest('.model').dataset.model
            let value = values[model][row.dataset.name]
            let digits = model === 'rgb' ? 0 : model === 'hsv' ? 1 : 2
            let number = row.querySelector('.number')
            if (number !== activeInput) number.value = Number(value.toFixed(digits))
            row.querySelector('.slider').value = value
        })
        palettes.forEach(input => input.value = hex)
        document.querySelector('#colorPreview').style.background = hex
        document.querySelector('#hexValue').textContent = hex.toUpperCase()
        document.querySelector('#warning').textContent = message
    }

    function gradients(colors) {
        rows.forEach((row, i) => row.querySelector('.slider').style.background = `linear-gradient(to right, ${colors[i].join(', ')})`)
    }

    function bind(onComponent, onPalette, onLighting, onFinish) {
        rows.forEach(row => {
            let model = row.closest('.model').dataset.model
            let name = row.dataset.name
            let number = row.querySelector('.number')
            let slider = row.querySelector('.slider')
            slider.setAttribute('aria-label', `${name.toUpperCase()} ${model.toUpperCase()}`)
            number.addEventListener('input', () => {
                if (number.value === '') return
                onComponent(model, name, number.valueAsNumber, Number(number.min), Number(number.max), number)
            })
            slider.addEventListener('input', () => onComponent(model, name, Number(slider.value), Number(slider.min), Number(slider.max)))
            number.addEventListener('blur', onFinish)
        })
        palettes.forEach(input => input.addEventListener('input', () => onPalette(input.value)))
        lighting.addEventListener('change', () => onLighting(lighting.value))
    }

    function components() {
        return rows.map(row => {
            let slider = row.querySelector('.slider')
            return {model: row.closest('.model').dataset.model, name: row.dataset.name, min: Number(slider.min), max: Number(slider.max)}
        })
    }

    return {render, gradients, bind, components}
})()
