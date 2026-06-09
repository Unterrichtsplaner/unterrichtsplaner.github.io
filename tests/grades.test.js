class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserver;

const { calculateStudentAverage, db } = require('../app.js');

describe('calculateStudentAverage', () => {
  beforeEach(() => {
    // Reset DB for each test
    db.groups = [];
    db.students = {};
  });

  it('calculates average with default 50/50 weighting', () => {
    // Setup Group
    const groupId = 'group1';
    db.groups.push({ id: groupId, schularbeitWeight: 50 });

    // Setup Student
    const student = {
      id: 'student1',
      grades: [
        { type: 'test', value: '1.0' }, // sonstige
        { type: 'test', value: '1.0' }, // sonstige
        { type: 'schularbeit', value: '3.0' } // schularbeit
      ]
    };

    // Expected: 
    // Sonstige avg = 1.0
    // Schularbeit avg = 3.0
    // Weighted = (1.0 * 50 + 3.0 * 50) / 100 = 2.0
    const result = calculateStudentAverage(student, groupId);
    expect(result).toBeCloseTo(2.0, 1);
  });

  it('calculates average with custom weighting', () => {
    // Setup Group with 60% schularbeit weight
    const groupId = 'group1';
    db.groups.push({ id: groupId, schularbeitWeight: 60 });

    const student = {
      id: 'student1',
      grades: [
        { type: 'test', value: '1.0' }, // sonstige
        { type: 'schularbeit', value: '3.0' } // schularbeit
      ]
    };

    // Expected:
    // Sonstige = 1.0 (weight 40%)
    // Schularbeit = 3.0 (weight 60%)
    // Weighted = (1.0 * 40 + 3.0 * 60) / 100 = (40 + 180) / 100 = 2.2
    const result = calculateStudentAverage(student, groupId);
    expect(result).toBeCloseTo(2.2, 1);
  });

  it('falls back to simple average when only sonstige grades exist', () => {
    const groupId = 'group1';
    db.groups.push({ id: groupId, schularbeitWeight: 50 });

    const student = {
      id: 'student1',
      grades: [
        { type: 'test', value: '1.0' },
        { type: 'mitarbeit', value: '2.0' },
        { type: 'hausaufgabe', value: '3.0' }
      ]
    };

    // Expected: (1+2+3)/3 = 2.0
    const result = calculateStudentAverage(student, groupId);
    expect(result).toBeCloseTo(2.0, 1);
  });

  it('falls back to simple average when only schularbeit grades exist', () => {
    const groupId = 'group1';
    db.groups.push({ id: groupId, schularbeitWeight: 50 });

    const student = {
      id: 'student1',
      grades: [
        { type: 'schularbeit', value: '2.0' },
        { type: 'klausur', value: '3.0' }
      ]
    };

    // Expected: (2+3)/2 = 2.5
    const result = calculateStudentAverage(student, groupId);
    expect(result).toBeCloseTo(2.5, 1);
  });

  it('returns null if there are no valid grades', () => {
    const groupId = 'group1';
    db.groups.push({ id: groupId, schularbeitWeight: 50 });

    const student = {
      id: 'student1',
      grades: []
    };

    const result = calculateStudentAverage(student, groupId);
    expect(result).toBeNull();
  });
});
