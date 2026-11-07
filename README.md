# grifo-leis

Textos de lei usados pelo app **Grifo**, convertidos das páginas do [Planalto](https://www.planalto.gov.br)
(legislação federal compilada) com os trechos revogados retirados.

Este repositório é atualizado automaticamente toda semana por um workflow do projeto Grifo, que baixa as
páginas, converte e só publica uma lei quando ela passa nas verificações (número de artigos, último artigo,
artigos repetidos e comparação com a versão anterior). O app baixa daqui as leis que mudaram.

- `manifest.json`: catálogo com, para cada lei, o hash do conteúdo e a data da última mudança
- `laws/<id>.json`: texto estruturado de cada lei (títulos, capítulos, artigos, parágrafos)

Textos de lei não são protegidos por direitos autorais (Lei nº 9.610/98, art. 8º, IV). Isto não substitui
a publicação oficial no Diário Oficial da União.
