"use client";

import { useState, useTransition } from "react";
import { lookupCurrentAssignment, assignGuruWali } from "@/app/dashboard/admin/penugasan-guru-wali/actions";

interface Student {
  id: string;
  fullName: string;
  className: string;
}

interface Teacher {
  id: string;
  fullName: string;
}

interface AcademicYear {
  id: string;
  year: string;
  isActive: boolean;
}

export function AssignGuruWaliForm({
  students,
  teachers,
  academicYears,
}: {
  students: Student[];
  teachers: Teacher[];
  academicYears: AcademicYear[];
}) {
  const activeYear = academicYears.find((y) => y.isActive) ?? academicYears[0];

  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [academicYearId, setAcademicYearId] = useState(activeYear?.id ?? "");
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [currentTeacherName, setCurrentTeacherName] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleCheck() {
    setMessage(null);
    startTransition(async () => {
      const assignment = await lookupCurrentAssignment(studentId, academicYearId);
      if (assignment) {
        const teacher = teachers.find((t) => t.id === assignment.teacherId);
        setCurrentTeacherName(teacher?.fullName ?? "(guru tidak ditemukan)");
      } else {
        setCurrentTeacherName(null);
      }
      setChecked(true);
    });
  }

  function handleAssign() {
    setMessage(null);
    startTransition(async () => {
      await assignGuruWali(teacherId, studentId, academicYearId);
      setMessage("Penugasan Guru Wali berhasil disimpan.");
      setChecked(false);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Peserta Didik</label>
        <select
          value={studentId}
          onChange={(e) => {
            setStudentId(e.target.value);
            setChecked(false);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName} - {s.className}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Tahun Pelajaran</label>
        <select
          value={academicYearId}
          onChange={(e) => {
            setAcademicYearId(e.target.value);
            setChecked(false);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
        >
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>
              {y.year} {y.isActive ? "(aktif)" : ""}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleCheck}
        disabled={isPending}
        className="w-fit rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Cek Guru Wali Saat Ini
      </button>

      {checked && (
        <p className="text-sm">
          Guru Wali saat ini:{" "}
          <span className="font-medium">{currentTeacherName ?? "Belum ada (siswa belum dibina siapa pun)"}</span>
        </p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">
          {currentTeacherName ? "Pindahkan ke Guru Wali" : "Tugaskan Guru Wali"}
        </label>
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
        >
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.fullName}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleAssign}
        disabled={isPending || !teacherId}
        className="w-fit rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
      >
        {isPending ? "Memproses..." : "Simpan Penugasan"}
      </button>

      {message && <p className="text-sm text-green-600">{message}</p>}
    </div>
  );
}
