# Scripts de conversion simples selon vos spécifications

## a) olympic_athletes.json → csv
import pandas as pd
df = pd.read_json('data/olympic_athletes.json')
df.to_csv('csv/olympic_athletes.csv', index=False)

## b) olympic_hosts.xml → csv
import pandas as pd
df = pd.read_xml('data/olympic_hosts.xml')
df.to_csv('csv/olympic_hosts.csv', index=False)

## c) olympic_medals.xlsx → csv
import pandas as pd
df = pd.read_excel('data/olympic_medals.xlsx')
df.to_csv('csv/olympic_medals.csv', index=False)

## d) olympic_results.html → csv
import pandas as pd
df = pd.read_html('data/olympic_results.html')[0]  # Si plusieurs tables, adapter l'indice
df.to_csv('csv/olympic_results.csv', index=False)