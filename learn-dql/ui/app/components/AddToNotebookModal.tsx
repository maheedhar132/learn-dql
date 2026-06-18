import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "@dynatrace/strato-components/overlays";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Paragraph, Strong } from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { Chip } from "@dynatrace/strato-components/content";
import { Select, TextInput, Label } from "@dynatrace/strato-components/forms";
import { BookmarkIcon, PlusIcon } from "@dynatrace/strato-icons";
import { documentsClient } from "@dynatrace-sdk/client-document";
import type { DocumentMetaData } from "@dynatrace-sdk/client-document";
import {
  buildMarkdownSection,
  buildDqlSection,
  buildNewNotebook,
  notebookToBlob,
  type NotebookContent,
} from "../lib/notebook";

interface AddToNotebookModalProps {
  title: string;
  description: string;
  explanation: string;
  query: string;
  onTrigger: (open: () => void) => React.ReactNode;
}

type Mode = "select" | "create";
type Status = "idle" | "loading" | "submitting" | "success" | "error";

export const AddToNotebookModal = ({
  title,
  description,
  explanation,
  query,
  onTrigger,
}: AddToNotebookModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("select");
  const [notebooks, setNotebooks] = useState<DocumentMetaData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [createdName, setCreatedName] = useState("");

  const loadNotebooks = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
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
      setMode("select");
      setSelectedId(null);
      setNewName(`${title} — Learn DQL`);
      setStatus("idle");
      setErrorMsg("");
      setCreatedName("");
      loadNotebooks();
    }
  }, [isOpen, title, loadNotebooks]);

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  const handleSubmit = async () => {
    setErrorMsg("");
    const markdownSection = buildMarkdownSection(title, description, explanation);
    const dqlSection = buildDqlSection(query);

    if (mode === "create") {
      const name = newName.trim();
      if (!name) {
        setErrorMsg("Notebook name is required.");
        return;
      }
      setStatus("submitting");
      try {
        const notebook = buildNewNotebook([markdownSection, dqlSection]);
        await documentsClient.createDocument({
          body: {
            name,
            type: "notebook",
            content: notebookToBlob(notebook),
          },
        });
        setCreatedName(name);
        setStatus("success");
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Failed to create notebook");
        setStatus("error");
      }
    } else {
      if (!selectedId) {
        setErrorMsg("Please select a notebook.");
        return;
      }
      setStatus("submitting");
      try {
        const doc = await documentsClient.getDocument({ id: selectedId });
        const existing = (await doc.content?.get("json")) as NotebookContent | null;
        const version = doc.metadata?.version;

        if (!existing || !version) {
          throw new Error("Could not read notebook content.");
        }

        existing.sections.push(markdownSection, dqlSection);

        await documentsClient.updateDocument({
          id: selectedId,
          optimisticLockingVersion: version,
          body: {
            content: notebookToBlob(existing),
          },
        });
        const nb = notebooks.find((n) => n.id === selectedId);
        setCreatedName(nb?.name ?? "notebook");
        setStatus("success");
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Failed to update notebook");
        setStatus("error");
      }
    }
  };

  const isSubmitting = status === "submitting";
  const isLoading = status === "loading";

  const footer = (
    <Flex justifyContent="flex-end" gap={8}>
      <Button variant="default" onClick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      {status !== "success" && (
        <Button
          variant="accent"
          onClick={handleSubmit}
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting ? "Saving…" : mode === "create" ? "Create notebook" : "Add to notebook"}
        </Button>
      )}
    </Flex>
  );

  return (
    <>
      {onTrigger(handleOpen)}

      <Modal
        title="Add to Notebook"
        show={isOpen}
        onDismiss={handleClose}
        footer={footer}
        size="small"
      >
        <Flex flexDirection="column" gap={16}>
          {status === "success" ? (
            <Flex flexDirection="column" gap={8}>
              <Paragraph>
                <Strong>{title}</Strong> was added to <Strong>{createdName}</Strong>.
              </Paragraph>
              <Paragraph style={{ margin: 0 }}>
                Open Dynatrace Notebooks to view and run the query.
              </Paragraph>
              <Button variant="default" style={{ alignSelf: "flex-start" }} onClick={handleClose}>
                Done
              </Button>
            </Flex>
          ) : (
            <>
              {/* Query preview chip */}
              <Flex gap={8} alignItems="center">
                <BookmarkIcon />
                <Strong>{title}</Strong>
                <Chip>DQL query</Chip>
              </Flex>

              {/* Mode toggle */}
              <Flex gap={8}>
                <Button
                  variant={mode === "select" ? "accent" : "default"}
                  onClick={() => setMode("select")}
                >
                  Add to existing
                </Button>
                <Button
                  variant={mode === "create" ? "accent" : "default"}
                  onClick={() => setMode("create")}
                >
                  <PlusIcon /> Create new
                </Button>
              </Flex>

              {/* Content area */}
              {mode === "select" && (
                <Flex flexDirection="column" gap={8}>
                  <Label>Select a notebook</Label>
                  {isLoading ? (
                    <Paragraph>Loading notebooks…</Paragraph>
                  ) : notebooks.length === 0 ? (
                    <Paragraph>
                      No notebooks found. Switch to <Strong>Create new</Strong> to make one.
                    </Paragraph>
                  ) : (
                    <Select
                      name="notebook-select"
                      value={selectedId ?? ""}
                      onChange={(val) => { if (val) setSelectedId(String(val)); }}
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
                </Flex>
              )}

              {mode === "create" && (
                <Flex flexDirection="column" gap={8}>
                  <Label>Notebook name</Label>
                  <TextInput
                    value={newName}
                    onChange={(v) => setNewName(v)}
                    placeholder="e.g. My DQL Reference"
                  />
                </Flex>
              )}

              {/* What gets added */}
              <Flex flexDirection="column" gap={4} style={{ opacity: 0.75 }}>
                <Paragraph style={{ margin: 0 }}>
                  A <Strong>Markdown tile</Strong> (header + explanation) and a{" "}
                  <Strong>DQL tile</Strong> (ready to run) will be added.
                </Paragraph>
              </Flex>

              {/* Error */}
              {(status === "error" || errorMsg) && (
                <Paragraph style={{ margin: 0, color: "var(--dt-color-text-critical, #e53935)" }}>
                  {errorMsg}
                </Paragraph>
              )}
            </>
          )}
        </Flex>
      </Modal>
    </>
  );
};
