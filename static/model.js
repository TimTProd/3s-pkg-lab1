const ColorModel = (() => {
    const whitePoints = {
        D65: [0.3127, 0.3290],
        D50: [0.3457, 0.3585],
        E: [1 / 3, 1 / 3]
    }
    const primaries = [[0.64, 0.33], [0.30, 0.60], [0.15, 0.06]]
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

    function multiply(matrix, vector) {
        return matrix.map(row => row.reduce((sum, value, i) => sum + value * vector[i], 0))
    }

    function inverse(matrix) {
        let rows = matrix.map((row, i) => [...row, ...[0, 1, 2].map(j => i === j ? 1 : 0)])
        for (let i = 0; i < 3; i++) {
            let pivot = i
            for (let j = i + 1; j < 3; j++) {
                if (Math.abs(rows[j][i]) > Math.abs(rows[pivot][i])) pivot = j
            }
            if (Math.abs(rows[pivot][i]) < 1e-12) throw new Error('Матрица необратима')
            let saved = rows[i]
            rows[i] = rows[pivot]
            rows[pivot] = saved
            let divisor = rows[i][i]
            rows[i] = rows[i].map(value => value / divisor)
            for (let j = 0; j < 3; j++) {
                if (j === i) continue
                let factor = rows[j][i]
                rows[j] = rows[j].map((value, k) => value - factor * rows[i][k])
            }
        }
        return rows.map(row => row.slice(3))
    }

    function createMatrices(standard) {
        if (!Object.hasOwn(whitePoints, standard)) throw new Error('Неизвестный стандарт освещения')
        let [x, y] = whitePoints[standard]
        let white = [x / y, 1, (1 - x - y) / y]
        let columns = primaries.map(([x, y]) => [x / y, 1, (1 - x - y) / y])
        let base = [0, 1, 2].map(i => columns.map(column => column[i]))
        let scale = multiply(inverse(base), white)
        let toXyz = base.map(row => row.map((value, i) => value * scale[i]))
        return {toXyz, toRgb: inverse(toXyz), white}
    }

    function linear(value) {
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    }

    function gamma(value) {
        return value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055
    }

    function rgbToXyz(rgb, matrices) {
        let values = multiply(matrices.toXyz, [rgb.r, rgb.g, rgb.b].map(value => linear(value / 255)))
        return {x: values[0] * 100, y: values[1] * 100, z: values[2] * 100}
    }

    function xyzToRgb(xyz, matrices) {
        let values = multiply(matrices.toRgb, [xyz.x / 100, xyz.y / 100, xyz.z / 100])
        let clipped = values.some(value => value < -1e-9 || value > 1 + 1e-9)
        values = values.map(value => gamma(clamp(value, 0, 1)) * 255)
        return {rgb: {r: values[0], g: values[1], b: values[2]}, clipped}
    }

    function rgbToHsv(rgb) {
        let r = rgb.r / 255
        let g = rgb.g / 255
        let b = rgb.b / 255
        let max = Math.max(r, g, b)
        let min = Math.min(r, g, b)
        let difference = max - min
        let h = 0
        if (difference !== 0) {
            if (max === r) h = 60 * (((g - b) / difference) % 6)
            else if (max === g) h = 60 * ((b - r) / difference + 2)
            else h = 60 * ((r - g) / difference + 4)
        }
        if (h < 0) h += 360
        return {h, s: max === 0 ? 0 : difference / max * 100, v: max * 100}
    }

    function hsvToRgb(hsv) {
        let h = hsv.h % 360
        let s = hsv.s / 100
        let v = hsv.v / 100
        let c = v * s
        let x = c * (1 - Math.abs((h / 60) % 2 - 1))
        let m = v - c
        let values
        if (h < 60) values = [c, x, 0]
        else if (h < 120) values = [x, c, 0]
        else if (h < 180) values = [0, c, x]
        else if (h < 240) values = [0, x, c]
        else if (h < 300) values = [x, 0, c]
        else values = [c, 0, x]
        values = values.map(value => (value + m) * 255)
        return {r: values[0], g: values[1], b: values[2]}
    }

    function rgbToHex(rgb) {
        return '#' + [rgb.r, rgb.g, rgb.b].map(value => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0')).join('')
    }

    function hexToRgb(hex) {
        return {r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16)}
    }

    return {clamp, multiply, inverse, createMatrices, linear, gamma, rgbToXyz, xyzToRgb, rgbToHsv, hsvToRgb, rgbToHex, hexToRgb}
})()

if (typeof module !== 'undefined') module.exports = ColorModel
