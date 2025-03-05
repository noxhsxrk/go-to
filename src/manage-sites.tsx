import { ActionPanel, Action, Form, List, showToast, getPreferenceValues, Toast, environment } from "@raycast/api";
import { useState } from "react";

interface Preferences {
  siteMappings: string;
}

interface Site { 
  name: string;
  url: string;
}

function getSites(): Site[] {
  const { siteMappings } = getPreferenceValues<Preferences>();
  try {
    const siteMap = JSON.parse(siteMappings);
    return Object.entries(siteMap).map(([name, url]) => ({ name, url: url as string }));
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Invalid site mappings format" });
    return [];
  }
}

function AddSiteForm({ onSiteAdded }: { onSiteAdded: () => void }) {
  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();

  async function handleSubmit(values: { name: string; url: string }) {
    try {
      const { siteMappings } = getPreferenceValues<Preferences>();
      const sites = JSON.parse(siteMappings || "{}");
      
      if (sites[values.name]) {
        setNameError("Site with this name already exists");
        return;
      }

      try {
        new URL(values.url);
      } catch {
        setUrlError("Invalid URL format");
        return;
      }

      sites[values.name] = values.url;
      await environment.writePreference("siteMappings", JSON.stringify(sites));
      await showToast({ style: Toast.Style.Success, title: "Site added successfully" });
      onSiteAdded();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to add site" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Site" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Site Name"
        placeholder="Enter site name"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="url"
        title="URL"
        placeholder="Enter site URL"
        error={urlError}
        onChange={() => setUrlError(undefined)}
      />
    </Form>
  );
}

export default function Command() {
  const [sites, setSites] = useState<Site[]>(getSites());
  const [isAddingNew, setIsAddingNew] = useState(false);

  const refreshSites = () => {
    setSites(getSites());
  };

  if (isAddingNew) {
    return <AddSiteForm onSiteAdded={() => {
      setIsAddingNew(false);
      refreshSites();
    }} />;
  }

  return (
    <List
      actions={
        <ActionPanel>
          <Action title="Add New Site" onAction={() => setIsAddingNew(true)} />
        </ActionPanel>
      }
    >
      {sites.map((site) => (
        <List.Item
          key={site.name}
          title={site.name}
          subtitle={site.url}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={site.url} />
              <Action
                title="Delete Site"
                onAction={async () => {
                  try {
                    const { siteMappings } = getPreferenceValues<Preferences>();
                    const sites = JSON.parse(siteMappings || "{}");
                    delete sites[site.name];
                    await environment.writePreference("siteMappings", JSON.stringify(sites));
                    refreshSites();
                    await showToast({ style: Toast.Style.Success, title: "Site deleted successfully" });
                  } catch (error) {
                    await showToast({ style: Toast.Style.Failure, title: "Failed to delete site" });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}  