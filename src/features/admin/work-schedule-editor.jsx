import React, { useEffect, useState } from 'react';
import { scheduleApi } from '../../lib/api';
import { notify, LoadingSkeleton } from '../../components/ui/feedback';
import { Clock, Plus, Trash2, Save, Info } from 'lucide-react';

const toMin = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};
const toHHMM = (mins) => {
  const t = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

// Same arithmetic as the server; shown live so the admin sees the effect of a change.
const workingMinutes = (start, end, breaks) => {
  let total = Math.max(0, toMin(end) - toMin(start));
  for (const b of breaks) {
    const s = toMin(b.start);
    const e = toMin(b.end);
    if (e <= s) continue;
    total -= Math.max(0, Math.min(toMin(end), e) - Math.max(toMin(start), s));
  }
  return Math.max(0, total);
};

const endTime = (start, minutes, breaks) => {
  let remaining = Number(minutes);
  let cursor = toMin(start);
  const sorted = breaks
    .map((b) => ({ s: toMin(b.start), e: toMin(b.end) }))
    .filter((b) => b.e > b.s)
    .sort((a, b) => a.s - b.s);
  while (remaining > 0) {
    const inside = sorted.find((b) => cursor >= b.s && cursor < b.e);
    if (inside) {
      cursor = inside.e;
      continue;
    }
    const next = sorted.find((b) => b.s > cursor);
    const chunk = Math.min(remaining, next ? next.s - cursor : remaining);
    cursor += chunk;
    remaining -= chunk;
  }
  return toHHMM(cursor);
};

const formatHours = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

export default function WorkScheduleEditor() {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState({ start: '09:00', minutes: 150 });

  const load = async () => {
    try {
      setLoading(true);
      const res = await scheduleApi.get();
      setSchedule({
        start: res.data.start,
        end: res.data.end,
        breaks: res.data.breaks.map((b) => ({ ...b })),
        is_default: res.data.is_default,
      });
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading || !schedule) return <LoadingSkeleton />;

  const effective = workingMinutes(schedule.start, schedule.end, schedule.breaks);

  const setBreak = (i, field, value) => {
    setSchedule((s) => {
      const breaks = [...s.breaks];
      breaks[i] = { ...breaks[i], [field]: value };
      return { ...s, breaks };
    });
  };

  const addBreak = () => {
    setSchedule((s) => ({ ...s, breaks: [...s.breaks, { name: 'New break', start: '10:00', end: '10:15' }] }));
  };

  const removeBreak = (i) => {
    setSchedule((s) => ({ ...s, breaks: s.breaks.filter((_, idx) => idx !== i) }));
  };

  const save = async () => {
    try {
      setSaving(true);
      await scheduleApi.save({
        start: schedule.start,
        end: schedule.end,
        breaks: schedule.breaks.map(({ name, start, end }) => ({ name, start, end })),
      });
      notify.success('Work schedule saved.');
      await load();
    } catch (err) {
      notify.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand';

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand" /> Working hours
          </h2>
          {schedule.is_default && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              using defaults, not saved yet
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Day starts</label>
            <input
              type="time"
              value={schedule.start}
              onChange={(e) => setSchedule({ ...schedule, start: e.target.value })}
              className={`w-full ${inputClass}`}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Day ends</label>
            <input
              type="time"
              value={schedule.end}
              onChange={(e) => setSchedule({ ...schedule, end: e.target.value })}
              className={`w-full ${inputClass}`}
            />
          </div>
          <div className="flex items-end">
            <div className="w-full p-2 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-[10px] font-bold text-emerald-700 uppercase">Effective working time</p>
              <p className="text-lg font-black text-emerald-700">{formatHours(effective)}</p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">Breaks</h3>
            <button
              onClick={addBreak}
              className="text-[11px] font-semibold text-brand hover:text-brand-dark flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add break
            </button>
          </div>
          <div className="space-y-2">
            {schedule.breaks.length === 0 && (
              <p className="text-xs text-slate-500 italic">No breaks. Working hours are counted in full.</p>
            )}
            {schedule.breaks.map((b, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <input
                  type="text"
                  value={b.name}
                  onChange={(e) => setBreak(i, 'name', e.target.value)}
                  placeholder="Break name"
                  className={`${inputClass} flex-1 min-w-[120px]`}
                />
                <input type="time" value={b.start} onChange={(e) => setBreak(i, 'start', e.target.value)} className={inputClass} />
                <span className="text-xs text-slate-400">to</span>
                <input type="time" value={b.end} onChange={(e) => setBreak(i, 'end', e.target.value)} className={inputClass} />
                <button onClick={() => removeBreak(i)} className="p-1.5 text-slate-400 hover:text-red-600" title="Remove break">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save schedule'}
          </button>
        </div>
      </div>

      {/* Live preview of the break-skipping rule */}
      <div className="bg-brand-light/60 border border-brand-light rounded-2xl p-5">
        <h3 className="text-sm font-bold text-brand-dark flex items-center gap-1.5 mb-3">
          <Info className="w-4 h-4" /> End-time preview
        </h3>
        <div className="flex flex-wrap items-end gap-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-brand-dark uppercase mb-1">Start</label>
            <input
              type="time"
              value={preview.start}
              onChange={(e) => setPreview({ ...preview, start: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-brand-dark uppercase mb-1">Duration (minutes)</label>
            <input
              type="number"
              min="0"
              step="15"
              value={preview.minutes}
              onChange={(e) => setPreview({ ...preview, minutes: Number(e.target.value) })}
              className={`${inputClass} w-28`}
            />
          </div>
          <div className="text-brand-dark">
            ends at{' '}
            <span className="text-base font-black">{endTime(preview.start, preview.minutes, schedule.breaks)}</span>
          </div>
        </div>
        <p className="text-[11px] text-brand-dark/70 mt-2">
          Time spent inside a break does not count towards the duration, so the end time moves later by each break it crosses.
        </p>
      </div>
    </div>
  );
}
