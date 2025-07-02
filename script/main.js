/*
 * Created on 01:45:16 Thu 2025-07-03, By L-Continue
 * Copyright (C) 2024 shiyao.space All rights reserved.
 * @Last Modified by:   L-Continue
 * @Last Modified time: 01:58:58 Thu 2025-07-03
 */

/**
 * 日历应用核心逻辑文件
 * 处理日期计算、日历渲染和生日提醒功能
 */

$.fn.visible = function (boolean = false) {
  return this.css('display', boolean ? '' : 'none');
};

/* global moment calendar */
moment.locale('zh-cn');

let cellLines = 7;
let daysRange = 15;
let stFromMon = true;

// 特殊日期和生日
const specialEvents = [
  '信用卡:13',
  '收房租:20',
];
const birthdaysList = [
  '瑶瑶爷爷:1955-05-03',
  '瑶瑶奶奶:1956-04-25',
  '瑶瑶姥姥:1964-07-29',
  '瑶瑶爸爸:1982-04-27',
  '瑶瑶妈妈:1988-02-25',
  '瑶瑶宝宝:2015-08-27',
];

/**
 * 构建日历应用所需的所有数据
 * @returns {Object} 包含时间、日期、日历和生日列表的数据对象
 */
function Data() {
  const time = {
    h: moment().format('HH'),
    m: moment().format('mm'),
    s: moment().format('ss'),
  };
  const date = {
    solar: moment().format('L'),
    today: moment().format('dddd'),
    lunar: Lunar(moment().format('L'), true),
  };
  const thisCalendar = Calendar(moment().month());
  const fullCalendar = [...Array(12)].map((_, arr) => Calendar(arr));
  const list = birthdaysList.map((str) => Difftime(...str.split(':')));

  return { time, date, thisCalendar, fullCalendar, list };
}

/**
 * 生成指定月份的日历数据
 * @param {number} index - 月份索引（0-11）
 * @returns {Object} 包含月份名称、星期标题和日期单元格数据的对象
 */
function Calendar(index) {
  const m = Number.isInteger(index) ? moment().month(index) : moment();
  const mths = m.format('M月');
  const head = moment.weekdaysMin(stFromMon);
  const main = [];

  const thisMonthDays = m.daysInMonth();
  const lastMonthDays = m.clone().subtract(1, 'months').daysInMonth();
  const firstDay = m.date(1).day() + (stFromMon ? 6 : 7);
  const totalCells = 7 * cellLines;

  // 填充上个月的日期
  for (let day = 0; day < firstDay; day++) {
    const solar = lastMonthDays - firstDay + day + 1;
    const lunar = Lunar(m.clone().subtract(1, 'months').date(solar).format('L'));
    main.push({ solar, lunar, class: 'last-month' });
  }

  // 填充这个月的日期
  for (let day = 0; day < thisMonthDays; day++) {
    const solar = day + 1;
    const lunar = Lunar(m.date(solar).format('L'));

    const isToday = m.date(solar).isSame(moment(), 'day');
    const isLists = birthdaysList.map(ParseDateString).some((item) => item.month == index + 1 && item.day == solar);
    const classname = `this-month${isToday ? ' today' : ''}${isLists ? ' birthday' : ''}`;

    const eventData = specialEvents.map(ParseDateString).find((item) => item.day == solar);
    const eventname = !!eventData ? eventData.label : '';
    main.push({ solar, lunar, class: classname, event: eventname });
  }

  // 填充下个月的日期
  const nextMonthStart = firstDay + thisMonthDays;
  for (let day = 0; nextMonthStart + day < totalCells; day++) {
    const solar = day + 1;
    const lunar = Lunar(m.clone().add(1, 'months').date(solar).format('L'));
    main.push({ solar, lunar, class: 'next-month' });
  }

  return { month: mths, head, main };
}

/**
 * 将公历日期转换为农历显示
 * @param {string} date - 公历日期字符串（格式：YYYY/MM/DD）
 * @param {boolean} isFullDisplay - 是否显示完整农历信息
 * @returns {string} 农历日期显示字符串
 */
function Lunar(date, isFullDisplay) {
  const [Y, M, D] = date.split('/');
  const lunar = calendar.solar2lunar(Y, M, D);

  const dateDisplay = lunar.lDay == 1 ? lunar.IMonthCn : lunar.lunarFestival || lunar.festival || lunar.Term || lunar.IDayCn;
  const fullDisplay = `${lunar.gzYear}${lunar.Animal}年 ${lunar.IMonthCn}${lunar.IDayCn} (${lunar.astro})`;

  return isFullDisplay ? fullDisplay : dateDisplay;
}

/**
 * 解析日期字符串为标签和日期组件
 * @param {string} entry - 日期字符串，格式为"标签:日期"
 * @returns {Object} 包含标签、月份和日期的对象
 */
function ParseDateString(entry) {
  const [label, val] = entry.split(':');
  const [month, day] = val.includes('-') ? val.split('-').map(Number).slice(1) : [null, Number(val)];

  return val.includes('-') ? { label, month, day } : { label, day };
}

/**
 * 计算生日距离今天的天数和年龄
 * @param {string} name - 姓名
 * @param {string} date - 生日日期字符串（格式：YYYY-MM-DD）
 * @returns {Object} 包含生日相关信息的对象
 */
function Difftime(name, date) {
  if (!name || !date) return false;

  const [_, M, D] = date.split('-');
  const m1 = moment();
  const m2 = moment().set({ M: M - 1, D });
  const m3 = m2.clone().add(1, 'year');

  const ages = m1.diff(moment(date), 'years') + '岁';
  const next = m2.isBefore(m1) ? m3.diff(m1, 'days') : m2.diff(m1, 'days');
  const progressMax = m3.diff(m2, 'days');
  const progressVal = progressMax - next;

  const tips = next == 0 ? '生日快乐' : next + '天';
  const isClose = next <= daysRange;
  const isToday = next == 0;

  return { name, ages, date, next, progressVal, progressMax, tips, isClose, isToday };
}

/**
 * HTML渲染和更新相关方法
 */
const Html = {
  // 创建日历应用的DOM结构
  create() {
    const { time, date, thisCalendar: { head, main }, fullCalendar, list } = Data();

    // 主体部分
    const $mainbody = $('<div class="section mainbody"/>').visible(true).appendTo('body');
    const $time = $('<div class="time"/>').appendTo($mainbody);
    const $date = $('<div class="date"/>').appendTo($mainbody);
    const $days = $('<div class="days"/>').appendTo($mainbody);
    const $list = $('<div class="list"/>').appendTo($mainbody);

    $.each(time, (classname) => $('<div/>').addClass(classname).appendTo($time));
    $.each(date, (classname) => $('<div/>').addClass(classname).appendTo($date));

    const $head = $('<div class="head"/>').appendTo($days);
    const $main = $('<div class="main"/>').appendTo($days);
    $.each(head, (i, val) => $('<span/>').appendTo($head));
    $.each(main, (i, val) => {
      const $item = $('<div/>').appendTo($main);
      $('<span class="event"/>').appendTo($item);
      $('<span class="solar"/>').appendTo($item);
      $('<span class="lunar"/>').appendTo($item);
    });

    $.each(list, (i, val) => {
      const $item = $('<div class="item"/>').appendTo($list);
      const $main = $('<div class="main"/>').appendTo($item);

      $('<span/>').addClass('name').appendTo($main);
      $('<span/>').addClass('date').appendTo($main);
      $('<span/>').addClass('ages').appendTo($main);
      $('<span/>').addClass('tips').appendTo($main);

      if (val.isClose) $item.addClass('near');
      if (val.isToday) $item.addClass('today');
    });

    // 全年日历
    const $calendar = $('<div class="section calendar"/>').visible(true).appendTo('body');
    $.each(fullCalendar, (i, val) => {
      const combArr = [...val.head.map((solar) => ({ solar })), ...val.main];

      const $days = $('<div class="days"/>').appendTo($calendar);
      const $head = $('<div class="head"/>').appendTo($days);
      const $main = $('<div class="main"/>').appendTo($days);

      $.each(combArr, (i, arr) => $('<span/>').appendTo($main));
    });

    // 进度条
    $('<progress class="diffBar"/>').appendTo($list.find('.item'));
    $('<progress class="weekBar"/>').insertAfter($head);
  },

  // 更新日历应用的DOM内容
  update() {
    const { time, date, thisCalendar: { head, main }, fullCalendar, list } = Data();

    // 主体部分
    const $mainbody = $('.section.mainbody');
    $.each(time, (i, val) => $mainbody.find('.time .' + i).text(i == 'h' ? val + ':' : val));
    $.each(date, (i, val) => $mainbody.find('.date .' + i).text(val));
    $.each(head, (i, val) => $mainbody.find('.days .head span').eq(i).text(val));
    $.each(main, (i, val) => {
      const $cells = $mainbody.find('.days .main div').eq(i).attr('class', val.class);
      $cells.find('span.event').text(val.event);
      $cells.find('span.solar').text(val.solar);
      $cells.find('span.lunar').text(val.lunar);
    });
    $.each(list, (i, val) => {
      const $list = $mainbody.find('.list .item .main').eq(i);
      $list.find('.name').text(val.name);
      $list.find('.date').text(val.date);
      $list.find('.ages').text(val.ages);
      $list.find('.tips').text(val.tips);
    });

    // 全年日历
    const $calendar = $('.section.calendar');
    $.each(fullCalendar, (i, val) => {
      $calendar.find('.head').eq(i).text(val.month);
      const $main = $calendar.find('.main').eq(i);
      const combArr = [...val.head.map((solar) => ({ solar })), ...val.main];
      $.each(combArr, (i, arr) => $main.find('span').eq(i).attr('class', arr.class).text(arr.solar));
    });

    // 进度条
    const progressWeekVal = moment().day() + (stFromMon ? 0 : 1) || 7;
    $('progress.weekBar').attr({ value: progressWeekVal, max: 7 });
    $.each(list, (i, val) => {
      $('.list .item progress').eq(i).attr({ value: val.progressVal, max: val.progressMax });
    });
  },
};

$(function () {
  Html.create();
  Html.update();
  setInterval(Html.update, 200);
});
