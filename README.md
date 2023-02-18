# wiki-university-colours
A project wherein I datamined wikipedia for the university colours and made a JS snippet to combine the colours of one into the other.

The data quality makes it a partial failure. But it works.

`new UniCombineColor(containing_div)` will add the functionality sought to the HTMLElement `containing_div`.
This is a screenshot as JS gets rightfully stripped from markdown in GitHub (else your cookies could be stolen):
![screenshot](screenshot.png)

## Infoboxes
I previously used a small class I wrote to iteratively find all the pages with infoboxes and get data from them.

```python
from wiki_category_analyser import WikicatParser
pages = WikicatParser(category='Category:Articles_using_infobox_university',
                      wanted_templates=['Infobox_university'])
pages.get_pages_recursively()
print(pages.data)
table = pages.to_dataframe()
```
This approach does not work well as it takes forever, when dealing with large datasets.
So I am not overly keen on downloading GB sized files for once in a while curiosities, 
but in this case downloading english Wikipedia is easier.
```python
import mwxml, bz2

dump = mwxml.Dump.from_file(bz2.open('dumps/enwiki-latest-pages-articles.xml.bz2',
                                     mode='rt', encoding='utf-8')
                           )
print(dump.site_info.name)  # Wikipedia
print(dump.site_info.dbname)  # enwiki

for page in dump:
    revision = next(page)
    ...
```
However, my first attempt using my parser, which is built on wikitextparser, could not deal with nested templates,
because its dependency is most likely regex-based as opposed to XML-like,
so weird hacks are required:

```python
wp = WikicatParser('', wanted_templates='Infobox university')

import re, functools
import pickle, gzip

def remove_cat(text, category):
    """
    A poor hack to circumvent nested templates
    """
    return re.sub(r'\{\{'+category+r'[^{}]*\}\}', '', text)

data = []

for page in dump:
    revision = next(page)
    if revision.text is None:
        continue
    if 'Infobox university' not in revision.text:
        continue
    text = revision.text.replace('\n','').replace('{{!}}', '')
    cleaned_text = functools.reduce(remove_cat, ['Cite', 'cite', 'Efn'], text)
    info = wp.parse_templates(revision.text)
    if 'name' not in info:
        continue
    data.append({'name': info['name'], 
                 'image_name': info.get('image_name', None),
                 'colors': info.get('colors', info.get('colours', None) )
                })

with gzip.open('unicolors.pkl.gz', 'wb') as fh:
    pickle.dump(data, fh)
len(data)
```

However, storing the whole of `info` reveals further issues.
US universities have `colors`, British ones `colours`, while Spanish universities have the tag `colores`...

```python
from typing import List, Dict, TypedDict
import pandas as pd
import pandera.typing as pdt

data: pd.DataFrame = pd.read_pickle('unicolors.p')
na2list = lambda v: v if isinstance(v, list) else []
data['hex']: pdt.Series[str] = data.colors.str.findall(r'(#\w+)').apply(na2list) + \
                               data.colours.str.findall(r'(#\w+)').apply(na2list)
data['name']: pdt.Series[str] = data['name'].str.replace(r'\{\{lang\|.*?\|(.*?)\}\}', r'\1', regex=True)\
                                            .str.replace('\'\'\'','', regex=False).fillna('').str.strip()

import re

def get_image(row: pd.Series):
    for entry in (row.logo, row.image, row.image_name):
        if isinstance(entry, str) and entry.strip():
            cleaned:str = entry.replace('File:', '').strip()
            return re.sub(r'[\[\]]', '', cleaned)
    return ''

data['image_name']: pdt.Series[str] = data.apply(get_image, axis=1)
data = data.loc[data['name'] != '']

import json


#d = data.loc[data.image_name.str.contains('.svg')].set_index('name').image_name.to_dict()
json_data = json.dumps(data[['name', 'image_name', 'hex']]\
                       .rename(columns={'hex': 'colors'})\
                       .to_dict(orient='records'))

with open('../wiki-university-colours/universities.json', 'w') as fh:
    fh.write(json_data)
```
## JS writing

I normally write Python for data exploration or functionality testing in a notebook, so how about JS?

First and foremost I should mention that Colab notebooks are run in embedded spaces, a sandpit basically so nothing can get out of them.
In a regular notebook, the output area HTMLElement is `element` and anything appended to `window` will be visible everywhere.
Go main namespace pollution!

```python
from IPython.display import display, HTML

import json

json_data = json.dumps(data[['name', 'image_name', 'hex']]\
                       .rename(columns={'hex': 'colors'})\
                       .to_dict(orient='records'))

display(HTML(f'<script>window.universities={json_data};</script>'))

with open('universities.json') as fh:
    js_block = fh.read();
display(HTML(f'<script type="module" id="university-code">{js_block}</script>'))
```

This means if I have a cell will the cell magic `%%javascript` I can do:
```javascript
import { University, UniCombineColor } from './university-code.js';
new UniCombineColor(element);
```
I actually wrote the JS in a large cell and did not do the module approach until the end.
So how was writing JS in a notebook cell?
I won't lie, it wasn't great. It is less of a faff than working with a monolithic project in PyCharm
or writing things in the console obviously, but it was not pleasant.

The code highlighting was off wack as `//` was not seen as a comment. In the code in fact I could not do `/#[0-9A-Z]{6}/gi` as `#` was seen as a comment and thought the command was unterminated, so I had to `new RegExp` it, which is sad.
