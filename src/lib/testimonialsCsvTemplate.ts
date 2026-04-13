import { downloadFile } from './exportUtils';

/** UTF-8 BOM helps Excel on Windows open the file as UTF-8. */
const BOM = '\uFEFF';

/**
 * CSV the parser expects: header row plus columns
 * quote, year, country, age, state, visa, occupation.
 * One example row — users can delete it or duplicate rows in Sheets/Excel.
 */
export const TESTIMONIALS_CSV_TEMPLATE = `${BOM}quote,year,country,age,state,visa,occupation
"Example quote — if the quote contains commas, keep the whole cell wrapped in double quotes.",2024,Australia,25,NSW,"Student Visa (500)","Hospitality (e.g. waiter, chef)"
`;

export function downloadTestimonialsCsvTemplate(): void {
  downloadFile(
    TESTIMONIALS_CSV_TEMPLATE,
    'mji-testimonials-template.csv',
    'text/csv;charset=utf-8'
  );
}
