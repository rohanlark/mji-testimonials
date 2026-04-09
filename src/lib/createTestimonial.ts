import { Testimonial } from '../types/testimonial';

/** New quote for manual add; stable unique id for keys and overrides. */
export function createEmptyTestimonial(): Testimonial {
  return {
    id: `testimonial-${crypto.randomUUID()}`,
    quote: '',
    year: '',
    country: '',
    age: '',
    state: '',
    visa: '',
    occupation: '',
  };
}
