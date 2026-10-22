import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { matyldaPhotographs } from './matylda';
import { reels } from './reels';
import slide1 from '../assets/slides/slide-1.jpg';
import slide2 from '../assets/slides/slide-2.jpg';
import slide3 from '../assets/slides/slide-3.jpg';
import slide4 from '../assets/slides/slide-4.jpg';
import slide5 from '../assets/slides/slide-5.jpg';
import slide6 from '../assets/slides/slide-6.jpg';
import slide7 from '../assets/slides/slide-7.jpg';
import slide8 from '../assets/slides/slide-8.jpg';
import slide9 from '../assets/slides/slide-9.jpg';

export interface PortfolioItem {
  id: string;
  type: 'image' | 'video';
  src: string;
  width: number;
  height: number;
  category: string;
  alt: string;
  fullSrc?: string;
  poster?: string;
  previewSrc?: string;
  featured?: number;
  project?: string;
  credit?: string;
  sourceUrl?: string;
}

export const studio = {
  email: 'hello@montistudio.co.uk',
  description: 'Monti is a creative office specialising in strategy, creative direction, and content within the fashion, beauty, and travel space—shaping and elevating visual identities and narratives with intention.',
  services: ['Creative Strategy & Visual Identity Consulting', 'Styling & Creative Direction', 'Influencer Outreach & Community Curation', 'Artistic Direction & Content Creation', 'UGC and UGC Sourcing'],
};
const photographs: Array<{ asset: ImageMetadata; category: string; alt: string; project?: string; credit?: string; featured?: number }> = [
  { asset: slide1, category: 'Travel', alt: 'Swimmers on a sunlit rocky coast', featured: 4 },
  { asset: slide2, category: 'Beauty', alt: 'A white flower and jewellery against a blue-grey background', featured: 10 },
  { asset: slide3, category: 'Fashion', alt: 'A cream suit and gold jewellery against a pale backdrop' },
  { asset: slide4, category: 'Fashion', alt: 'A white shirt framed by a rustic doorway' },
  { asset: slide5, category: 'Fashion', alt: 'A yellow shirt against a coastal landscape' },
  { asset: slide6, category: 'Beauty', alt: 'L.A. Bruket skincare products in a still life' },
  { asset: slide7, category: 'Travel', alt: 'A quiet hotel bedside still life' },
  { asset: slide8, category: 'Travel', alt: 'A Mediterranean swimming pool in the sun' },
  { asset: slide9, category: 'Beauty', alt: 'A gold necklace resting on white fabric' },
  ...matyldaPhotographs,
];
export async function getPortfolio(): Promise<PortfolioItem[]> {
  const photos = await Promise.all(photographs.map(async ({ asset, ...details }, i) => {
    const ratio = asset.width / asset.height;
    const [image, preview] = await Promise.all([
      getImage({ src: asset, width: Math.min(1440, Math.floor(2160 * ratio), asset.width), format: 'webp', quality: 88 }),
      getImage({ src: asset, width: Math.min(768, Math.floor(1152 * ratio), asset.width), format: 'webp', quality: 82 }),
    ]);
    return { ...details, id: String(i + 1).padStart(2, '0'), type: 'image' as const, src: image.src, previewSrc: preview.src, width: asset.width, height: asset.height };
  }));
  const film: PortfolioItem = { id: 'film', type: 'video' as const, src: '/film-preview.mp4', fullSrc: '/slide-video.mp4', poster: '/film-poster.jpg', width: 540, height: 960, category: 'Fashion', alt: 'Fashion film featuring jewellery, sunglasses and a patterned skirt', featured: 6, project: undefined, credit: undefined };
  return [...photos.slice(0, 4), film, ...photos.slice(4), ...reels];
}
