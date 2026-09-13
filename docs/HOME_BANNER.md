# Banner da página inicial

O banner está em `components/home/Hero.tsx` e os estilos/animações em `Hero.module.css`.
As opções são controladas pela lista `celebrations`: título, descrição, imagem e tipo de evento do catálogo.
Não há troca automática: o visitante escolhe por toque, clique ou teclado (Tab, Enter, Espaço e setas).
O banner respeita a preferência de movimento reduzido do dispositivo.

## Imagens

As fotografias são imagens inspiracionais do Unsplash, não um portfólio de montagens da Vânia Festas.
Foram baixadas para `public/images/home` para que o banner não dependa de um servidor externo de imagens durante o uso.

- `casamento.jpg`: https://images.unsplash.com/photo-1511795409834-ef04bbd61622
- `infantil.jpg`: https://images.unsplash.com/photo-1530103862676-de8c9debad1d
- `quinze-anos.jpg`: https://images.unsplash.com/photo-1519167758481-83f550bb49b3

Para usar fotos próprias, substitua os arquivos e ajuste a descrição `alt` e `position` na lista `celebrations`.
A nota fixa de avaliação foi substituída por uma legenda de inspiração; só inserir avaliações quando houver fonte verificável.
