# ClassMana V2.5 — Revisão 14 | Arquivos para GitHub Pages

Este pacote contém o jogo completo em HTML, JavaScript, imagens e áudios para publicação como site estático. **Não contém executável, arquivo BAT nem servidor local.**

## Publicar pelo site do GitHub

1. **Extraia este ZIP** uma única vez no seu computador.
2. Abra seu repositório no GitHub e envie **os arquivos e pastas extraídos**, preservando a estrutura. Coloque `index.html` **na raiz do repositório**, junto com `campanha.js`, `nucleo_global.js` e as pastas `reinos`, `motor` e `assets`.
3. Em **Settings > Pages**, escolha **Deploy from a branch**, selecione `main` e **/(root)**, e salve.
4. Abra o endereço publicado pelo GitHub Pages quando estiver disponível.

**Importante:** não envie apenas o ZIP ao repositório esperando que o GitHub Pages o abra; o GitHub não descompacta automaticamente um ZIP enviado como arquivo. Use o conteúdo extraído.

## Esta revisão

- 10 reinos, 49 territórios.
- Reino 10, território 4/5: apoio do herói deslocado 20 pixels para baixo, de forma local.
- Atalhos de teste mantidos: F6 próximo território, F7 chefão, F8 próximo reino, Shift+F8 reino anterior.
- Base de áudio da Revisão 13 preservada, incluindo `cm_dracarys_pass.mp3`, `cm_peaks_pass.mp3` e `cm_duquesa_aranha.mp3`.
- Ranking antigo desativado, modo de teste ativo.

**Limitações:** a aplicação ainda depende de alguns recursos externos da V2.4 e de conexão com a internet. A renderização, os movimentos e os sons ainda exigem teste no navegador após publicação. A inspeção estática não substitui uma partida.
