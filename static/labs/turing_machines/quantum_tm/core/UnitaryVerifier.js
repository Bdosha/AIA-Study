class UnitaryVerifier {
    // Проверка унитарности матрицы преобразования
    static verifyUnitary(matrix) {
        const errors = [];
        const states = Array.from(matrix.keys());
        
        // Проверка: U†U = I
        states.forEach(state1 => {
            states.forEach(state2 => {
                let dotProduct = { re: 0, im: 0 };
                
                states.forEach(state3 => {
                    const u31 = matrix.get(state3)?.get(state1);
                    const u32 = matrix.get(state3)?.get(state2);
                    
                    if (u31 && u32) {
                        // U†[state3, state1] * U[state3, state2]
                        const conjugated = this.conjugate(u31);
                        const product = this.multiplyAmplitudes(conjugated, u32);
                        
                        dotProduct.re += product.re;
                        dotProduct.im += product.im;
                    }
                });
                
                // Должно быть 1 на диагонали, 0 вне диагонали
                const expectedReal = state1 === state2 ? 1 : 0;
                const expectedImag = 0;
                
                if (Math.abs(dotProduct.re - expectedReal) > 0.001 || 
                    Math.abs(dotProduct.im - expectedImag) > 0.001) {
                    errors.push({
                        state1: state1,
                        state2: state2,
                        expected: { re: expectedReal, im: expectedImag },
                        actual: dotProduct,
                        difference: {
                            re: Math.abs(dotProduct.re - expectedReal),
                            im: Math.abs(dotProduct.im - expectedImag)
                        }
                    });
                }
            });
        });
        
        return {
            isUnitary: errors.length === 0,
            errors: errors
        };
    }
    
    // Сопряжение комплексного числа
    static conjugate(amplitude) {
        return {
            re: amplitude.re,
            im: -amplitude.im
        };
    }
    
    // Умножение комплексных чисел
    static multiplyAmplitudes(amp1, amp2) {
        return {
            re: amp1.re * amp2.re - amp1.im * amp2.im,
            im: amp1.re * amp2.im + amp1.im * amp2.re
        };
    }
    
    // Проверка унитарности таблицы переходов
    static verifyTransitionTable(transitionTable) {
        return transitionTable.checkUnitarity();
    }
}