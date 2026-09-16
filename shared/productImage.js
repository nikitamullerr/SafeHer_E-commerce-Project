import images from './hosted-images.json' with { type: 'json' };
export function productImage(value) {
 if (!value?.startsWith('/images/products/')) return value;
 const stem = value.split('/').pop().replace(/\.[^.]+$/, '');
 return images[stem + '.png'] || images[stem + '.jpg'] || '';
}
