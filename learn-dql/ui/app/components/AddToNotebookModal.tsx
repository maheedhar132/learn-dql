import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "@dynatrace/strato-components/overlays";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Paragraph } from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { Select, TextInput } from "@dynatrace/strato-components/forms";
import { PlusIcon } from "@dynatrace/strato-icons";
import { documentsClient } from "@dynatrace-sdk/client-document";
import { openDocument } from "@dynatrace-sdk/navigation";
import type { DocumentMetaData } from "@dynatrace-sdk/client-document";
import {
  buildMarkdownSection,
  buildDqlSection,
  buildNewNotebook,
  notebookToBlob,
  type NotebookContent,
} from "../lib/notebook";

interface AddToNotebookModalProps {
  /** Short title describing the query (used as notebook tile header). */
  title: string;
  /** One-line description of what the query does. */
  description: string;
  /** Longer explanation text placed in the markdown tile. */
  explanation: string;
  /** The DQL query string. */
  query: string;
  /** Render-prop: receives an `open` callback and should return the trigger element. */
  onTrigger: (open: () => void) => React.ReactNode;
}

type Status = "loading" | "idle" | "creating" | "submitting" | "error";

export const AddToNotebookModal = ({
  title,
  description,
  explanation,
  query,
  onTrigger,
}: AddToNotebookModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notebooks, setNotebooks] = useState<DocumentMetaData[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // "New notebook" inline creation state
  const [showNameInput, setShowNameInput] = useState(false);
  const [newName, setNewName] = useState("");

  const reset = useCallback(() => {
    setSelectedId("");
    setStatus("idle");
    setErrorMsg("");
    setShowNameInput(false);
    setNewName(`${title} — Learn DQL`);
  }, [title]);

  const loadNotebooks = useCallback(async () => {
    setStatus("loading");
    try {
      const result = await documentsClient.listDocuments({
        filter: "type == 'notebook'",
      });
      setNotebooks(result.documents ?? []);
      setStatus("idle");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to load notebooks");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      reset();
      void loadNotebooks();
    }
  }, [isOpen, reset, loadNotebooks]);

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  // Create a brand-new notebook immediately and navigate to it
  const handleCreateNew = async () => {
    const name = newName.trim() || `${title} — Learn DQL`;
    setStatus("creating");
    setErrorMsg("");
    try {
      const notebook = buildNewNotebook([
        buildMarkdownSection(title, description, explanation),
        buildDqlSection(query),
      ]);
      const doc = await documentsClient.createDocument({
        body: { name, type: "notebook", content: notebookToBlob(notebook) },
      });
      setIsOpen(false);
      openDocument(doc.id);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to create notebook");
      setStatus("error");
    }
  };

  // Append to an existing notebook and navigate to it
  const handleConfirm = async () => {
    if (!selectedId) return;
    setStatus("submitting");
    setErrorMsg("");
    try {
      const doc = await documentsClient.getDocument({ id: selectedId });
      const existing = (await doc.content?.get("json")) as NotebookContent | null;
      const version = doc.metadata?.version;
      if (!existing || !version) throw new Error("Could not read notebook content.");

      existing.sections.push(
        buildMarkdownSection(title, description, explanation),
        buildDqlSection(query),
      );

      await documentsClient.updateDocument({
        id: selectedId,
        optimisticLockingVersion: version,
        body: { content: notebookToBlob(existing) },
      });
      setIsOpen(false);
      openDocument(selectedId);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to update notebook");
      setStatus("error");
    }
  };

  const isLoading = status === "loading";
  const isBusy = status === "creating" || status === "submitting";
  const hasSelection = selectedId !== "";

  const footer = (
    <Flex justifyContent="space-between" alignItems="center" style={{ width: "100%" }}>
      {/* Left: New notebook */}
      {!showNameInput ? (
        <Button
          variant="accent"
          onClick={() => setShowNameInput(true)}
          disabled={isBusy}
        >
          <PlusIcon /> New notebook
        </Button>
      ) : (
        <Flex gap={8} alignItems="center">
          <TextInput
            value={newName}
            onChange={(v) => setNewName(v)}
            placeholder="Notebook name"
            style={{ minWidth: 200 }}
          />
          <Button variant="accent" onClick={() => { void handleCreateNew(); }} disabled={isBusy}>
            {status === "creating" ? "Creating…" : "Create"}
          </Button>
          <Button variant="default" onClick={() => setShowNameInput(false)} disabled={isBusy}>
            ✕
          </Button>
        </Flex>
      )}

      {/* Right: Cancel + Confirm */}
      <Flex gap={8}>
        <Button variant="default" onClick={handleClose} disabled={isBusy}>
          Cancel
        </Button>
        <Button
          variant="accent"
          onClick={() => { void handleConfirm(); }}
          disabled={!hasSelection || isBusy}
        >
          {status === "submitting" ? "Adding…" : "Confirm"}
        </Button>
      </Flex>
    </Flex>
  );

  return (
    <>
      {onTrigger(handleOpen)}

      <Modal
        title="Select destination"
        show={isOpen}
        onDismiss={handleClose}
        footer={footer}
        size="small"
      >
        <Flex flexDirection="column" gap={12}>
          {isLoading ? (
            <Paragraph>Loading notebooks…</Paragraph>
          ) : notebooks.length === 0 ? (
            <>
              <Select name="doc-select" value="" onChange={() => {}} disabled>
                <Select.Content>
                  <Select.Option value="">Select a document</Select.Option>
                </Select.Content>
              </Select>
              <Paragraph style={{ margin: 0, fontSize: "0.85rem", opacity: 0.65 }}>
                No documents available, please create a new document.
              </Paragraph>
            </>
          ) : (
            <Select
              name="doc-select"
              value={selectedId}
              onChange={(v) => { if (v) setSelectedId(String(v)); }}
            >
              <Select.Content>
                {notebooks.map((nb) => (
                  <Select.Option key={nb.id} value={nb.id}>
                    {nb.name}
                  </Select.Option>
                ))}
              </Select.Content>
            </Select>
          )}

          {errorMsg && (
            <Paragraph style={{ margin: 0, color: "var(--dt-color-text-critical, #e53935)", fontSize: "0.85rem" }}>
              {errorMsg}
            </Paragraph>
          )}
        </Flex>
      </Modal>
    </>
  );
};
