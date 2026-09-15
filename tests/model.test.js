const test = require('node:test')
const assert = require('node:assert/strict')
const model = require('../static/model.js')

function close(actual, expected, tolerance = 1e-7) {
    assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`)
}

function colorClose(actual, expected) {
    Object.keys(expected).forEach(key => close(actual[key], expected[key]))
}

test('D65: RGB to XYZ matches reference coordinates of primaries', () => {
    let matrices = model.createMatrices('D65')
    let cases = [
        [{r: 255, g: 0, b: 0}, {x: 41.2390799266, y: 21.2639005872, z: 1.9330818716}],
        [{r: 0, g: 255, b: 0}, {x: 35.7584339384, y: 71.5168678768, z: 11.9194779795}],
        [{r: 0, g: 0, b: 255}, {x: 18.0480788402, y: 7.2192315361, z: 95.0532152250}]
    ]
    cases.forEach(([rgb, xyz]) => colorClose(model.rgbToXyz(rgb, matrices), xyz))
})

for (const [standard, expected] of [
    ['D65', {x: 100 * 0.3127 / 0.3290, y: 100, z: 100 * (1 - 0.3127 - 0.3290) / 0.3290}],
    ['D50', {x: 100 * 0.3457 / 0.3585, y: 100, z: 100 * (1 - 0.3457 - 0.3585) / 0.3585}],
    ['E', {x: 100, y: 100, z: 100}]
]) {
    test(`${standard}: white and black`, () => {
        let matrices = model.createMatrices(standard)
        colorClose(model.rgbToXyz({r: 255, g: 255, b: 255}, matrices), expected)
        colorClose(model.rgbToXyz({r: 0, g: 0, b: 0}, matrices), {x: 0, y: 0, z: 0})
        let result = model.xyzToRgb(expected, matrices)
        colorClose(result.rgb, {r: 255, g: 255, b: 255})
        assert.equal(result.clipped, false)
    })

    test(`${standard}: 1000 distinct RGB round trips without quantization`, () => {
        let matrices = model.createMatrices(standard)
        for (let i = 0; i < 1000; i++) {
            let rgb = {r: i % 256, g: Math.floor(i / 256) * 53, b: i * 97 % 256}
            let result = model.xyzToRgb(model.rgbToXyz(rgb, matrices), matrices)
            colorClose(result.rgb, rgb)
            assert.equal(result.clipped, false)
        }
    })
}

test('changing lighting rebuilds both matrices', () => {
    let d65 = model.createMatrices('D65')
    let d50 = model.createMatrices('D50')
    let e = model.createMatrices('E')
    assert.notDeepEqual(d65.toXyz, d50.toXyz)
    assert.notDeepEqual(d65.toRgb, d50.toRgb)
    assert.notDeepEqual(d50.toXyz, e.toXyz)
    assert.throws(() => model.createMatrices('invalid'))
})

test('matrix inversion supports pivot swaps and does not mutate input', () => {
    let matrix = [[0, 1, 2], [1, 0, 3], [4, 5, 6]]
    let copy = matrix.map(row => [...row])
    let inverted = model.inverse(matrix)
    for (let i = 0; i < 3; i++) {
        let unit = [0, 0, 0]
        unit[i] = 1
        let result = model.multiply(inverted, model.multiply(matrix, unit))
        result.forEach((value, j) => close(value, unit[j]))
    }
    assert.deepEqual(matrix, copy)
    assert.throws(() => model.inverse([[1, 2, 3], [2, 4, 6], [0, 0, 0]]))
})

test('sRGB transfer functions and midgray', () => {
    close(model.linear(0.04045), 0.04045 / 12.92)
    close(model.gamma(0.0031308), 0.0031308 * 12.92)
    close(model.linear(128 / 255), 0.21586050011389926)
    close(model.gamma(model.linear(128 / 255)) * 255, 128)
})

test('HSV: all six hue sectors and 360 degrees', () => {
    let colors = [
        {r: 255, g: 0, b: 0}, {r: 255, g: 255, b: 0},
        {r: 0, g: 255, b: 0}, {r: 0, g: 255, b: 255},
        {r: 0, g: 0, b: 255}, {r: 255, g: 0, b: 255}
    ]
    colors.forEach((rgb, i) => {
        colorClose(model.rgbToHsv(rgb), {h: i * 60, s: 100, v: 100})
        colorClose(model.hsvToRgb({h: i * 60, s: 100, v: 100}), rgb)
    })
    colorClose(model.hsvToRgb({h: 360, s: 100, v: 100}), colors[0])
    colorClose(model.hsvToRgb({h: 30, s: 100, v: 100}), {r: 255, g: 127.5, b: 0})
})

test('HSV: grayscale, black and intermediate coordinates', () => {
    colorClose(model.rgbToHsv({r: 0, g: 0, b: 0}), {h: 0, s: 0, v: 0})
    colorClose(model.rgbToHsv({r: 128, g: 128, b: 128}), {h: 0, s: 0, v: 128 / 255 * 100})
    colorClose(model.hsvToRgb({h: 212.34, s: 0, v: 50}), {r: 127.5, g: 127.5, b: 127.5})
    let hsv = {h: 212.34, s: 61.23, v: 78.91}
    colorClose(model.rgbToHsv(model.hsvToRgb(hsv)), hsv)
})

test('XYZ out of gamut uses Clipping', () => {
    for (const standard of ['D65', 'D50', 'E']) {
        let result = model.xyzToRgb({x: 100, y: 0, z: 0}, model.createMatrices(standard))
        assert.equal(result.clipped, true)
        close(result.rgb.r, 255)
        close(result.rgb.g, 0)
        Object.values(result.rgb).forEach(value => assert.ok(Number.isFinite(value) && value >= 0 && value <= 255))
    }
})

test('HEX conversion and display rounding', () => {
    assert.equal(model.rgbToHex({r: 255, g: 127.5, b: 0}), '#ff8000')
    assert.deepEqual(model.hexToRgb('#4f86c6'), {r: 79, g: 134, b: 198})
})
