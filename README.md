# ClassMana V2.5 — Revisão 16 | Arquivos para GitHub Pages

Este pacote contém o jogo completo em HTML, JavaScript, imagens e áudios para publicação como site estático. **Não contém executável, arquivo BAT nem servidor local.**

## Publicar pelo site do GitHub

1. **Extraia este ZIP** uma única vez no seu computador.
2. Abra seu repositório no GitHub e envie **os arquivos e pastas extraídos**, preservando a estrutura. Coloque `index.html` **na raiz do repositório**, junto com `campanha.js`, `nucleo_global.js` e as pastas `reinos`, `motor` e `assets`.
3. Em **Settings > Pages**, escolha **Deploy from a branch**, selecione `main` e **/(root)**, e salve.
4. Abra o endereço publicado pelo GitHub Pages quando estiver disponível.

**Importante:** não envie apenas o ZIP ao repositório esperando que o GitHub Pages o abra; o GitHub não descompacta automaticamente um ZIP enviado como arquivo. Use o conteúdo extraído.

## Revisão 16 — arte das interfaces de jornada

- **Janela Guardar progresso:** novo brasão feito com escudo e cristal 3D do ClassMana, moldura dupla dourada, indicadores visíveis de Reino, Território e Pontos; botão de confirmar reforçado e ação de voltar à batalha.
- **Sem ícone de disquete:** estados de salvar, encerrar, enviar, sucesso e falha usam elementos do próprio universo do jogo.
- **Transições de início/continuidade e reino:** painel de portal com escudo, cristal, adaga, fundo medieval e barra luminosa animada.
- **Comandos da batalha:** guardar progresso e finalizar partida com cores e bordas do mesmo tema.
- **Responsividade:** telas menores e janelas de baixa altura; movimentos reduzidos para usuários com preferência de acessibilidade.
- **Funcionalidade preservada:** as ações de salvar, finalizar, cancelar e a confirmação do servidor continuam ligadas aos mesmos handlers.

**Verificação:** código e IDs essenciais conferidos; comportamento visual no navegador publicado ainda precisa de validação.

## Revisão 15 — entrada, continuidade e encerramento

- Tela de **Nova Partida / Continuar Partida** redesenhada com identidade ClassMana, informações da aventura salva e confirmação clara antes de reiniciar.
- **Voltar às opções** na confirmação de nova partida não fecha mais toda a seleção.
- **Continuar** usa o reino, o território, herói e pontos do checkpoint confirmado. O início e a passagem para outro território agora disparam um salvamento.
- A música de preparação é solicitada desde 0% da carga. Se o navegador bloquear reprodução automática, o botão de ativação aparece imediatamente para um clique do aluno (restrição do navegador).
- **Parar e salvar** guarda a aventura sem encerrá-la. **Finalizar partida** encerra a sessão, solicita registro online e aguarda confirmação do servidor antes de anunciar sucesso.
- Ranking da V2.4 continua desativado e isolado.

**Verificação:** atualizações conferidas no código do GitHub. A execução real no navegador, o comportamento de autoplay e a resposta do Apps Script após uma nova partida ainda precisam ser testados em ambiente publicado.

## Histórico — Revisão 14

- 10 reinos, 49 territórios.
- Reino 10, território 4/5: apoio do herói deslocado 20 pixels para baixo, de forma local.
- Atalhos de teste mantidos: F6 próximo território, F7 chefão, F8 próximo reino, Shift+F8 reino anterior.
- Base de áudio da Revisão 13 preservada, incluindo `cm_dracarys_pass.mp3`, `cm_peaks_pass.mp3` e `cm_duquesa_aranha.mp3`.
- Ranking antigo desativado, modo de teste ativo.

**Limitações:** a aplicação ainda depende de alguns recursos externos da V2.4 e de conexão com a internet. A renderização, os movimentos e os sons ainda exigem teste no navegador após publicação. A inspeção estática não substitui uma partida.
