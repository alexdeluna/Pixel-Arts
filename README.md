# Pixel Adventure — Mundo 1: A Floresta Perdida

Esta entrega amplia o motor Canvas original com uma campanha de cinco fases, máscaras, checkpoints, segredos, progressão persistente e o Guardião da Floresta.

## Executar

```powershell
python -m http.server 8080
```

Abra `http://localhost:8080`.

## Controles

- `A`/`D` ou setas: mover
- `Espaço`, `W` ou seta acima: pular; Ninja permite um terceiro pulo
- `X`/`K`: atacar; Guerreiro destrói blocos e o golpe atinge o núcleo exposto do chefe

## Conteúdo

1. Colinas Azuis — tutorial e Ninja
2. Bosque Sombrio — ruínas e Guerreiro oculto
3. Rio Perdido — correnteza e Arqueiro exclusivo oculto
4. Ruínas da Floresta — blocos quebráveis e passagem secreta
5. Covil da Criatura — Guardião com raízes, impacto, sementes, núcleo e ciclos de vulnerabilidade

Cada fase tem geometria, rotas, alturas, paredes físicas, checkpoint, saída e segredo próprios. As máscaras são fixas, mas nunca obrigatórias: Ninja ganha pulo triplo e investida; Guerreiro quebra blocos rachados; Arqueiro dispara flechas e derrota criaturas. A transformação também altera visualmente o personagem. O progresso é salvo no navegador. O Modo Teste registra danos, sem matar ou remover máscaras. O chefe exige 3/5/7 acertos no Fácil/Normal/Difícil.

## Playtest recomendado

Validar a sensação de saltos e combate no toque, a leitura dos segredos e a cadência do chefe em todas as dificuldades; testar instalação/offline da PWA.


Atualização visual: cenário com céu em gradiente, montanhas em camadas, árvores pixel-art com copas irregulares, parallax, plataformas com textura de terra/pedra e detalhes de vegetação no primeiro plano. A lógica de colisão e movimentação foi preservada.
