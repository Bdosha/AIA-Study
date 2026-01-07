/**
 * Пресеты (паттерны) и дефолтные параметры UI.
 * Важное:
 *  - presetDefault() — стартовые параметры при открытии страницы.
 *  - Каждый пресет может задать width/height/rule и spawn — массив муравьёв
 *    относительно центра поля: { dx, dy, dir }, где dir: 0=↑,1=→,2=↓,3=←.
 *  - Для турмитов допускаются действия F/U.
 */

/** @returns {{width:number,height:number,rule:string,ants:number}} */
export function presetDefault(){
  // Сделано меньше клеток ради более крупного визуального масштаба.
  return { width: 90, height: 60, rule: 'RL', ants: 1 };
}

/**
 * Набор паттернов для классического муравья Лэнгтона (2 цвета, правило RL).
 * @returns {Array<{name:string,rule:string,width:number,height:number,spawn:Array<{dx:number,dy:number,dir:number}>,note:string}>}
 */
export function presetsLangton(){
  return [
    {
      name: 'Классика: один муравей (RL)',
      rule: 'RL', width: 120, height: 80,
      // Один муравей в центре (dx/dy — от центра)
      spawn: [{ dx:0, dy:0, dir:0 }],
      note: 'Хаос → «шоссе» после ~10k шагов.',
    },
    {
      name: '«Сюрикэн-8» (RL)',
      rule: 'RL', width: 140, height: 90,
      // 8 муравьёв по лучам: интересные дорожки от центра
      spawn: [
        { dx:0,  dy:-10, dir:2 }, { dx:0,  dy:-15, dir:2 },
        { dx:10, dy:0,   dir:3 }, { dx:15, dy:0,   dir:3 },
        { dx:0,  dy:10,  dir:0 }, { dx:0,  dy:15,  dir:0 },
        { dx:-10,dy:0,   dir:1 }, { dx:-15,dy:0,   dir:1 },
      ],
      note: 'Циклическая структура, напомниающая сюрикэн из 8 агентов RL',
    },
    {
      name: '«Вихрь-6» (RL)',
      rule: 'RL', width: 140, height: 90,
      // Шестёрка в вершинах гекса — хаотика → несколько «шоссе»
      spawn: [
        { dx:-8, dy:-8, dir:1 }, { dx:8, dy:-8, dir:3 },
        { dx:12,dy:0,  dir:3 }, { dx:-12,dy:0, dir:1 },
        { dx:-8, dy:8, dir:1 }, { dx:8, dy:8, dir:3 },
      ],
      note: 'Долгая хаотика, затем несколько «шоссе».',
    },
  ];
}

/**
 * Набор паттернов для турмитов (3+ цветов, с действиями F/U).
 * @returns {Array<{name:string,rule:string,width:number,height:number,spawn:Array<{dx:number,dy:number,dir:number}>,note:string}>}
 */
export function presetsTurmites(){
  return [
    {
      name: '3 цвета: RLF',
      rule: 'RLF', width: 130, height: 90,
      spawn: [{ dx:0, dy:0, dir:0 }],
      note: '3 цвета: RLF — правило RLF R L F F добавляет длинные прямолинейные сегменты (мин. муравьёв: 1, выберете и нажмите старт)',
    },
    {
      name: '3 цвета: LFU (с разворотом)',
      rule: 'LFU', width: 130, height: 90,
      spawn: [
        { dx:-6, dy:0, dir:1 },
        { dx:6,  dy:0, dir:3 },
      ],
      note: '3 цвета: LFU (с разворотом) — правило LFU L F U U локализует движение: появляются симметричные завихрения (мин. муравьёв: 2, выберете и нажмите старт)',
    },
    {
      name: '4 цвета: RRFU',
      rule: 'RRFU', width: 150, height: 100,
      spawn: [
        { dx:0,  dy:0,  dir:0 },
        { dx:10, dy:0,  dir:3 },
        { dx:-10,dy:0,  dir:1 },
      ],
      note: '4 цвета: RRFU — правило RRFU R R F U Длинные потоки с редкими U-переориентациями; (мин. муравьёв: 3, выберете и нажмите старт)',
    },
    {
      name: '4 цвета: RLUF',
      rule: 'RLUF', width: 150, height: 100,
      spawn: [
        { dx:0,  dy:-8, dir:2 },
        { dx:8,  dy:0,  dir:3 },
        { dx:0,  dy:8,  dir:0 },
        { dx:-8, dy:0,  dir:1 },
      ],
      note: 'Устойчивые «ручьи» + поворотные петли.',
    },
  ];
}
