(function () {
  function calculate(state, now) {
    if (!state || !Array.isArray(state.recs)) return null;
    var purchase = Number(state.purchase || 0), years = Number(state.years || 5);
    if (!Number.isFinite(purchase) || purchase < 0 || !Number.isFinite(years) || years <= 0) return null;
    var rec = 0;
    for (var i = 0; i < state.recs.length; i++) {
      var r = state.recs[i];
      if (!r || !Number.isFinite(Number(r.amt)) || Number(r.amt) < 0 || !r.d || !Number.isFinite(new Date(r.d).getTime())) return null;
      rec += Number(r.amt);
    }
    var from = state.bought || (state.recs.length ? state.recs.map(function (r) { return r.d; }).sort()[0] : "");
    var m = from ? Math.max(1, (new Date(now || Date.now()) - new Date(from)) / 864e5 / 30.4) : 0;
    if (!Number.isFinite(m)) return null;
    var per = purchase / (years * 12), real = m ? rec / m : 0, total = real + per;
    var life = total * m;
    return { m:m, rec:rec, real:real, per:per, total:total, available:!!(from || purchase), perKm:state.km > 0 && life ? life / state.km : 0, yearKm:state.km > 0 && m ? state.km / (m / 12) : 0 };
  }
  function apply(budget, result) {
    if (!budget || !Array.isArray(budget.expense) || !result || !result.available || !Number.isFinite(result.total) || result.total < 0) return null;
    var items = budget.expense.filter(function (x) { return /交通/.test(x.name); });
    if (items.length > 1) return null;
    var item = items[0];
    if (!item) { item = { id:"vehicle-transport", name:"交通費", kind:"var", amt:0 }; budget.expense.push(item); }
    item.amt = Math.round(result.total);
    item.vehicleAnalysis = { real:Math.round(result.real), purchaseMonthly:Math.round(result.per), months:result.m, total:item.amt };
    return item;
  }
  window.HibikiVehicleCost = { calculate:calculate, apply:apply };
})();
