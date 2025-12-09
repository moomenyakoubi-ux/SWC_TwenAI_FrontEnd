import React, { createContext, useContext, useMemo, useState } from 'react';
import fakeProfiles from '../data/fakeProfiles';

const ContactsContext = createContext();

export const ContactsProvider = ({ children }) => {
  const [profiles, setProfiles] = useState(fakeProfiles);

  const setContactStatus = (profileId, isContact) => {
    setProfiles((prev) =>
      prev.map((profile) =>
        profile.id === profileId ? { ...profile, isContact: Boolean(isContact) } : profile,
      ),
    );
  };

  const toggleContact = (profileId) => {
    setProfiles((prev) =>
      prev.map((profile) =>
        profile.id === profileId ? { ...profile, isContact: !profile.isContact } : profile,
      ),
    );
  };

  const contacts = useMemo(() => profiles.filter((profile) => profile.isContact), [profiles]);

  const value = useMemo(
    () => ({
      profiles,
      contacts,
      setContactStatus,
      toggleContact,
    }),
    [profiles, contacts],
  );

  return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>;
};

export const useContacts = () => useContext(ContactsContext);
