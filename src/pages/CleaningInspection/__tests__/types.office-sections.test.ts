import {
  getActiveSections,
  OFFICE_SECTION_IDS,
  OPTIONAL_SECTIONS,
  removeOfficeSections,
} from '../types';

describe('CleaningInspection office sections', () => {
  it('returns office optional sections when selected', () => {
    const officeIds = [...OFFICE_SECTION_IDS];

    const sections = getActiveSections(officeIds);
    const ids = sections.map(section => section.id);

    expect(ids).toEqual(officeIds);
  });

  it('keeps office section IDs in optional sections list', () => {
    const optionalIds = new Set(OPTIONAL_SECTIONS.map(section => section.id));
    const everyOfficeSectionExists = OFFICE_SECTION_IDS.every(sectionId =>
      optionalIds.has(sectionId)
    );

    expect(everyOfficeSectionExists).toBe(true);
  });

  it('removes office sections while keeping non-office sections', () => {
    const sections = ['kitchen', 'living-room', ...OFFICE_SECTION_IDS];

    const filtered = removeOfficeSections(sections);

    expect(filtered).toEqual(['kitchen', 'living-room']);
  });
});
