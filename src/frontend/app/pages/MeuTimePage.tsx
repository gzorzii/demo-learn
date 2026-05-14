import axios from 'axios';
import { useEffect, useState } from 'react';
import { StartCfModal } from '../components/StartCfModal';
import { TeamEmptyState } from '../components/TeamEmptyState';
import { TeamMemberCard } from '../components/TeamMemberCard';
import { TeamMemberCardSkeleton } from '../components/TeamMemberCardSkeleton';
import { Button } from '../components/ui/button';
import { fetchTeamMembers, startCf } from '../services/teamService';
import type { TeamMemberDTO } from '../types/team';

export function MeuTimePage() {
  const [teamMembers, setTeamMembers] = useState<TeamMemberDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberDTO | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [memberErrors, setMemberErrors] = useState<Record<string, string>>({});

  function load() {
    setLoading(true);
    setError(false);
    fetchTeamMembers()
      .then(data => {
        setTeamMembers(data.teamMembers);
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function handleConfirmStartCf() {
    if (!selectedMember) return;

    setSubmitting(true);
    try {
      await startCf(selectedMember.userId);
      setMemberErrors(prev => {
        const next = { ...prev };
        delete next[selectedMember.userId];
        return next;
      });
      setSelectedMember(null);
      load();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const errorCode = err.response.data?.errorCode as string;
        setMemberErrors(prev => ({ ...prev, [selectedMember.userId]: errorCode }));
        setSelectedMember(null);
        load();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-black text-[#2D2A96]">Meu Time</h1>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <TeamMemberCardSkeleton />
          <TeamMemberCardSkeleton />
          <TeamMemberCardSkeleton />
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-gray-500">
            Não foi possível carregar os membros do time. Tente novamente.
          </p>
          <Button variant="outline" onClick={load}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!loading && !error && teamMembers.length === 0 && <TeamEmptyState />}

      {!loading && !error && teamMembers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {teamMembers.map(member => (
            <TeamMemberCard
              key={member.userId}
              userId={member.userId}
              name={member.name}
              email={member.email}
              activeCycle={member.activeCycle}
              eligibility={member.eligibility}
              lastError={memberErrors[member.userId] ?? null}
              onStartCf={() => setSelectedMember(member)}
            />
          ))}
        </div>
      )}

      {selectedMember && (
        <StartCfModal
          memberName={selectedMember.name}
          isOpen={true}
          isSubmitting={submitting}
          onConfirm={handleConfirmStartCf}
          onCancel={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}
