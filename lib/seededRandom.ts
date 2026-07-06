export function xmur3(str: string) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
    }
    return function () {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
}

export function sfc32(a: number, b: number, c: number, d: number) {
    return function () {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        let t = (a + b) | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        d = d + 1 | 0;
        t = t + d | 0;
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

export function getSeededRandom(seedString: string) {
    const seed = xmur3(seedString);
    return sfc32(seed(), seed(), seed(), seed());
}

export function seededShuffleArray<T>(array: T[], randomFunc: () => number): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(randomFunc() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function shuffleOptionsForQuestion(question: any, studentIdentifier: string): any {
    if (!question.options || question.options.length === 0) return question;
    if (!question.shuffleOptions) return question;
    if (question.type !== 'mcq' && question.type !== 'msq') return question;

    const seedString = `${studentIdentifier}_${question.id || question._id}`;
    const randomFunc = getSeededRandom(seedString);

    const indices: number[] = question.options.map((_: any, i: number) => i);
    const shuffledIndices = seededShuffleArray(indices, randomFunc);

    const newOptions = shuffledIndices.map((origIdx) => question.options[origIdx]);
    const newCorrectIndices = (question.correctIndices || []).map((origCorrectIdx: number) => {
        return shuffledIndices.indexOf(origCorrectIdx);
    });

    return {
        ...question,
        options: newOptions,
        correctIndices: newCorrectIndices
    };
}
