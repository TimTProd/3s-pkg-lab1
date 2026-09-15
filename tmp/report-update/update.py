from copy import deepcopy
from pathlib import Path
from zipfile import ZipFile
from lxml import etree

source = Path('/Users/Tim/uni/pkg/lab1/tmp/report-update/original.docx')
output = Path('/Users/Tim/uni/pkg/lab1/Отчет по ЛР 1 Тышко Тимофей.docx')
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'm': 'http://schemas.openxmlformats.org/officeDocument/2006/math'}
q = lambda name: '{' + ns[name.split(':')[0]] + '}' + name.split(':')[1]

with ZipFile(source) as z:
    entries = z.infolist()
    parts = {e.filename: z.read(e.filename) for e in entries}
root = etree.fromstring(parts['word/document.xml'])
body = root.find('w:body', ns)
paragraphs = body.findall('w:p', ns)
regular = deepcopy(paragraphs[3].find('w:r/w:rPr', ns))
bold = deepcopy(paragraphs[2].find('w:r/w:rPr', ns))

def plain(index, text, lead=None):
    p = deepcopy(paragraphs[index])
    for child in list(p):
        if child.tag != q('w:pPr'):
            p.remove(child)
    for value, heavy in ([(lead, True), (text, False)] if lead else [(text, index in [2, 4, 11, 18, 27])]):
        r = etree.SubElement(p, q('w:r'))
        r.append(deepcopy(bold if heavy else regular))
        if lead and not heavy:
            etree.SubElement(r, q('w:br'))
        t = etree.SubElement(r, q('w:t'))
        t.text = value
    return p

changes = {
    21: ('Для каждой модели добавлены числовые поля, ползунки и стандартная палитра. Отдельно показываются текущий цвет и HEX. В списке освещения можно выбрать D65, D50 или E. Фон всех девяти ползунков пересчитывается при изменении цвета: для каждого градиента варьируется только его компонента, а остальные сохраняют текущие значения. Градиент строится по 31 рассчитанной точке.', 'Создание интерфейса.'),
    22: ('RGB нормализуется к диапазону 0–1 и переводится в линейные значения передаточной функцией sRGB. Матрица RGB→XYZ вычисляется из хроматичностей основных цветов и выбранной белой точки, а обратная матрица находится методом Гаусса–Жордана с выбором главного элемента. При смене D65, D50 или E обе матрицы рассчитываются заново, RGB сохраняется, а XYZ и градиенты обновляются. Готовые коэффициенты матриц в программе не используются.', 'Преобразование RGB и XYZ.'),
    24: ('Функция changeComponent принимает изменённую координату и вызывает преобразование модели. Функция setColor обновляет состояние RGB, XYZ и HSV, сохраняя исходные введённые координаты. Функция refresh передаёт значения представлению и рассчитывает градиенты. Математика находится в model.js, работа с элементами страницы — в view.js, а управление состоянием и вызовами — в script.js. Модель не обращается к интерфейсу.', 'Обработка событий и разделение слоёв.'),
    25: ('Если линейные каналы после XYZ→RGB выходят за диапазон 0–1, применяется Clipping: значения ограничиваются допустимыми границами до гамма-коррекции. Пользователь получает предупреждение. Введённые XYZ сохраняются, но RGB-предпросмотр после обрезания может не воспроизводить их точно. Промежуточные расчёты не округляются; округляется только отображение.', 'Обработка некорректных значений.'),
    26: ('Добавлены 19 автоматических микротестов на встроенном тестовом модуле Node.js. Проверяются контрольные XYZ основных цветов D65, белый и чёрный для трёх источников, обратные матрицы, гамма-коррекция, шесть секторов HSV, серые цвета и Clipping. Для каждого источника проверяется обратный переход 1000 различных RGB. Тесты контроллера проверяют синхронизацию и градиенты. Все 19 тестов проходят. В браузере проверены освещение, дробный ввод, ползунки и предупреждение.', 'Проверка приложения.')
}
for index, (text, lead) in changes.items():
    old = paragraphs[index]
    body.replace(old, plain(index, text, lead))
body.replace(paragraphs[17], plain(17, 'браузер и Node.js для проверки интерфейса и запуска автоматических тестов.'))
for text in [
    'Добавить выбор D65, D50 и E и расчёт матриц перехода на лету.',
    'Реализовать динамические градиенты и разделить Model, View и Controller.',
    'Написать автоматические микротесты математики и логики обновления.'
]:
    body.insert(body.index(paragraphs[11]), plain(6, text))

def mr(text):
    r = etree.Element(q('m:r'))
    t = etree.SubElement(r, q('m:t'))
    t.text = text
    return r

def expr(values):
    return [mr(values)] if isinstance(values, str) else values

def frac(top, bottom):
    f = etree.Element(q('m:f'))
    for name, values in [('m:num', top), ('m:den', bottom)]:
        e = etree.SubElement(f, q(name))
        e.extend(expr(values))
    return f

def sup(base, power):
    s = etree.Element(q('m:sSup'))
    etree.SubElement(s, q('m:e')).extend(expr(base))
    etree.SubElement(s, q('m:sup')).extend(expr(power))
    return s

def sub(base, index):
    s = etree.Element(q('m:sSub'))
    etree.SubElement(s, q('m:e')).extend(expr(base))
    etree.SubElement(s, q('m:sub')).extend(expr(index))
    return s

def equation(values):
    p = plain(3, '')
    for child in list(p):
        if child.tag != q('w:pPr'):
            p.remove(child)
    prop = p.find('w:pPr', ns)
    if prop is None:
        prop = etree.SubElement(p, q('w:pPr'))
    etree.SubElement(prop, q('w:jc')).set(q('w:val'), 'center')
    math = etree.SubElement(p, q('m:oMath'))
    math.extend(values)
    return p

math_content = [
    plain(2, 'Математические формулы'),
    plain(3, 'Нормализация RGB и переход к линейным каналам выполняются следующим образом.'),
    equation([mr('r = '), frac('R', '255'), mr(',  g = '), frac('G', '255'), mr(',  b = '), frac('B', '255')]),
    equation([mr('f(u) = '), frac('u', '12.92'), mr('  при u ≤ 0.04045')]),
    equation([mr('f(u) = '), sup([mr('('), frac('u + 0.055', '1.055'), mr(')')], '2.4'), mr('  при u > 0.04045')]),
    plain(3, 'Матрица A составляется из трёх столбцов (x/y, 1, (1−x−y)/y) основных цветов. Вектор W задаётся выбранной белой точкой с Y=1. Масштабы каналов S и обе матрицы вычисляются, а не хранятся готовыми.'),
    equation([mr('S = '), sup('A', '−1'), mr('W,  M = A diag(S),  N = '), sup('M', '−1')]),
    equation([sup('(X, Y, Z)', 'T'), mr(' = 100 M '), sup('(f(r), f(g), f(b))', 'T')]),
    equation([sup([mr('('), sub('r', 'l'), mr(', '), sub('g', 'l'), mr(', '), sub('b', 'l'), mr(')')], 'T'), mr(' = N '), sup([mr('('), frac('X', '100'), mr(', '), frac('Y', '100'), mr(', '), frac('Z', '100'), mr(')')], 'T')]),
    plain(3, 'После обратного матричного преобразования выполняются Clipping и гамма-коррекция g. Итоговый канал RGB равен 255·g(u).'),
    equation([mr('u = min(1, max(0, '), sub('u', 'l'), mr('))')]),
    equation([mr('g(u) = 12.92u  при u ≤ 0.0031308')]),
    equation([mr('g(u) = 1.055 '), sup('u', [frac('1', '2.4')]), mr(' − 0.055  при u > 0.0031308')]),
    plain(3, 'Для RGB→HSV используются максимум a, минимум d и разность Δ нормализованных каналов. Тон H определяется максимальным каналом и сектором цветового круга; для серого цвета условно принимается H=0.'),
    equation([mr('a = max(r, g, b),  d = min(r, g, b),  Δ = a − d')]),
    equation([mr('V = a,  S = '), frac('Δ', 'a'), mr(' при a > 0;  S = 0 при a = 0')]),
    plain(3, 'Для HSV→RGB насыщенность и яркость переводятся из процентов в диапазон 0–1. По сектору H выбирается перестановка C, Q и 0, затем к каналам добавляется m и результат умножается на 255.'),
    equation([mr('C = VS,  m = V − C,  Q = C(1 − |('), frac('H', '60'), mr(' mod 2) − 1|)')]),
    plain(3, 'Используются хроматичности основных цветов (0.64, 0.33), (0.30, 0.60), (0.15, 0.06) и белых точек D65 (0.3127, 0.3290), D50 (0.3457, 0.3585), E (1/3, 1/3). При D50/E реализовано учебное RGB-пространство с той же передаточной функцией, а не стандартный sRGB или ICC-конвертация.'),
    plain(3, 'Контроль для D65: RGB(255, 0, 0) → XYZ(41.23908, 21.26390, 1.93308) и HSV(0°, 100%, 100%). Дробные результаты тестов сравниваются с погрешностью 10⁻⁷. Запуск тестов: node --test tests/*.test.js.')
]
for item in math_content:
    body.insert(body.index(paragraphs[27]), item)
body.replace(paragraphs[28], plain(28, 'По варианту 8 создано веб-приложение для RGB, XYZ и HSV с числовым вводом, ползунками и палитрой. Реализованы динамический расчёт матриц D65/D50/E, градиенты всех компонентов и Clipping с предупреждением. Код разделён на независимую математическую модель, представление и контроллер. Корректность проверена 19 автоматическими тестами и в браузере.'))
for p in body.findall('w:p', ns):
    text = ''.join(p.itertext())
    runs = p.findall('w:r', ns)
    is_heading = len(runs) == 1 and runs[0].find('w:rPr/w:b', ns) is not None
    if is_heading:
        prop = p.find('w:pPr', ns)
        if prop is None:
            prop = etree.SubElement(p, q('w:pPr'))
        if prop.find('w:keepNext', ns) is None:
            etree.SubElement(prop, q('w:keepNext'))

parts['word/document.xml'] = etree.tostring(root, xml_declaration=True, encoding='UTF-8', standalone='yes')
with ZipFile(output, 'w') as z:
    for entry in entries:
        z.writestr(entry, parts[entry.filename])
print(output)
