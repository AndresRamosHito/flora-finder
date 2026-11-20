-- Account deletion: deleting auth.users must not be blocked by records that point at the profile.
-- Verifications made by a deleted user are removed; trade reports are kept but de-identified.
alter table public.verifications drop constraint verifications_verifier_id_fkey,
  add constraint verifications_verifier_id_fkey foreign key (verifier_id) references public.profiles(id) on delete cascade;
alter table public.trade_reports drop constraint trade_reports_reporter_id_fkey,
  add constraint trade_reports_reporter_id_fkey foreign key (reporter_id) references public.profiles(id) on delete set null;
alter table public.trade_reports drop constraint trade_reports_reviewer_id_fkey,
  add constraint trade_reports_reviewer_id_fkey foreign key (reviewer_id) references public.profiles(id) on delete set null;

-- Record when a user confirmed they are 12+ (with parental permission if under 18) and accepted Terms/Privacy.
alter table public.profiles add column if not exists age_terms_confirmed_at timestamptz;
