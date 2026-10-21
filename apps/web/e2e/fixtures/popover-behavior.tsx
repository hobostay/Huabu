// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Button } from '@/components/Common/Button';
import { MilkdownEditor } from '@/components/Milkdown/MilkdownEditor';
import { MilkdownFloatingToolbar } from '@/components/Milkdown/MilkdownFloatingToolbar';
import { AiSummaryButton } from '@/components/Nodes/AiSummaryButton';
import { ProvenanceOverlay } from '@/components/Nodes/note/ProvenanceOverlay';
import { SketchSizePicker } from '@/components/Nodes/sketch/SketchSizePicker';
import { AgentSelector } from '@/components/Panels/ChatPanel/AgentSelector';

import type { MilkdownInstance } from '@/components/Milkdown/createMilkdown';

function PopoverBehaviorFixture() {
  const [instance, setInstance] = useState<MilkdownInstance | null>(null);
  const [size, setSize] = useState(4);
  const [result, setResult] = useState('');
  const surface = useRef<HTMLDivElement>(null);
  const key = instance?.snapshotBlocks().keys[0];
  const record = (action: string) => setResult(action);

  return (
    <div className="flex flex-col items-start gap-4 p-4">
      <output data-behavior-result>{result}</output>
      <Button onClick={() => record('outside')}>Outside action</Button>
      <div data-long-agents>
        <AgentSelector
          currentBinding={{ kind: 'internal' }}
          currentMode="ask"
          editable
          onSelect={(choice) =>
            record(
              choice.binding.kind === 'external'
                ? (choice.binding.alias ?? '')
                : 'internal',
            )
          }
          profiles={Array.from({ length: 35 }, (_, index) => ({
            id: `profile-${index}`,
            alias: `Agent ${index}`,
            agentletId: 'fixture',
            workingDirPath: '/fixture',
            launch: { kind: 'acp-command', command: 'fixture' },
          }))}
        />
      </div>
      <AiSummaryButton
        summary={'LongUnbrokenSummary'.repeat(30)}
        keywords={['LongUnbrokenKeyword'.repeat(15)]}
      />
      <SketchSizePicker
        label="Audit thickness"
        value={size}
        min={1}
        max={20}
        onChange={setSize}
      />
      <div ref={surface} className="relative mx-3 mt-24 w-[calc(100%-24px)]">
        <MilkdownFloatingToolbar instance={instance} surfaceRef={surface} />
        <MilkdownEditor
          markdown="A changed paragraph for keyboard review."
          onReady={setInstance}
        />
        {instance && key && (
          <ProvenanceOverlay
            editor={instance}
            containerRef={surface}
            blocks={[
              {
                key,
                baselineMarkdown: 'Original paragraph.',
                at: '2026-01-01',
              },
            ]}
            tombstones={[
              {
                key: 'deleted-fixture',
                baselineMarkdown: 'Deleted paragraph.',
                anchorKey: key,
                at: '2026-01-01',
              },
            ]}
            onAcceptBlock={() => record('accepted')}
            onRejectBlock={() => record('rejected')}
            onRestoreTombstone={() => record('restored')}
            onDismissTombstone={() => record('dismissed')}
          />
        )}
      </div>
    </div>
  );
}

export function mountPopoverBehaviorFixture() {
  const app = document.getElementById('root');
  if (app) app.style.visibility = 'hidden';
  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;inset:0;z-index:10;background:var(--bg-default);overflow:auto';
  document.body.append(host);
  createRoot(host).render(<PopoverBehaviorFixture />);
}
