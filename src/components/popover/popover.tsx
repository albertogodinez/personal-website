import { CheckIcon, Cross2Icon, MixerHorizontalIcon } from '@radix-ui/react-icons';
import * as Popover from '@radix-ui/react-popover';
import * as Separator from '@radix-ui/react-separator';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { useEffect, useState } from 'react';

import './popover.css';

interface PopoverWrapperProps {
  tags: string[];
  onExperienceSelectionChange: (selection: string[]) => void;
  onSelectedTagsChange: (tags: string[]) => void;
}

const PopoverWrapper: React.FC<PopoverWrapperProps> = ({ tags, onExperienceSelectionChange, onSelectedTagsChange }) => {
  const [inputValue, setInputValue] = useState('');
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [experienceSelection, setExperienceSelection] = useState<string[]>([]);

  const handleFilteredTagClick = (tag: string) => {
    console.log('clicked tag', tag);
    // remove tag from filtered tags and add tag into selected tags
    setSelectedTags([...selectedTags, tag]);

    console.log('filteredTags before', filteredTags);
    console.log(
      'removed tag',
      filteredTags.filter((filteredTag) => filteredTag !== tag)
    );
    setFilteredTags(filteredTags.filter((filteredTag) => filteredTag !== tag));

    console.log('selectedTags', selectedTags);
    if ([...selectedTags, tag].length > 0) {
      onSelectedTagsChange([...selectedTags, tag]);
    }
  };

  const handleSelectedTagClick = (tag: string) => {
    setFilteredTags([...filteredTags, tag]);
    setSelectedTags(selectedTags.filter((selectedTag) => selectedTag !== tag));
    onSelectedTagsChange(selectedTags);
  };

  const handleExperienceSelectionChange = (selection: string[]) => {
    setExperienceSelection(selection);
    onExperienceSelectionChange(selection);
  };

  useEffect(() => {
    if (inputValue) {
      setFilteredTags(tags.filter((tag) => tag.toLowerCase().includes(inputValue.toLowerCase())));
    } else {
      setFilteredTags([]);
    }
  }, [inputValue, tags]);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="IconButton" aria-label="set filters">
          <MixerHorizontalIcon />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="PopoverContent" sideOffset={5}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="flex width-100 flex-jc-space-between flex-align-items-start ">
              <h3 className="Text" style={{ marginBottom: 10 }}>
                filters
              </h3>
              <Popover.Close className="PopoverClose" aria-label="Close">
                <Cross2Icon />
              </Popover.Close>
            </div>
            <fieldset className="flex flex-column mb-2">
              <div className="flex gap-2 mb-2">
                <label className="Label" htmlFor="width">
                  experience:
                </label>
                <ToggleGroup.Root
                  className="ToggleGroup"
                  type="single"
                  defaultValue="all"
                  aria-label="experience selection"
                >
                  <ToggleGroup.Item
                    className="ToggleGroupItem"
                    value="all"
                    aria-label="all experience"
                    onClick={() => handleExperienceSelectionChange(['work', 'projects'])}
                  >
                    all
                  </ToggleGroup.Item>
                  <ToggleGroup.Item
                    className="ToggleGroupItem"
                    value="work"
                    aria-label="work experience"
                    onClick={() => handleExperienceSelectionChange(['work'])}
                  >
                    work
                  </ToggleGroup.Item>
                  <ToggleGroup.Item
                    className="ToggleGroupItem"
                    value="projects"
                    aria-label="project experience"
                    onClick={() => handleExperienceSelectionChange(['projects'])}
                  >
                    projects
                  </ToggleGroup.Item>
                </ToggleGroup.Root>
              </div>
            </fieldset>
            <Separator.Root className="separator mb-2" orientation="horizontal" />
            <fieldset className="flex flex-column">
              <div className="flex gap-2 mb-2">
                <label className="Label" htmlFor="width">
                  tags:
                </label>
                <input
                  id="autoComplete"
                  type="text"
                  className="Input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </div>
              {selectedTags && (
                <ul className="tagsList">
                  {selectedTags.map((tag, index) => (
                    <li key={index} className="tag" onClick={() => handleSelectedTagClick(tag)}>
                      {tag}
                      <CheckIcon />
                    </li>
                  ))}
                </ul>
              )}
              {selectedTags.length > 0 && filteredTags.length > 0 && (
                <Separator.Root className="separator" orientation="horizontal" />
              )}
              {filteredTags.length > 0 && (
                <ul className="tagsList">
                  {filteredTags.map((tag, index) => (
                    <li key={index} className="tag" onClick={() => handleFilteredTagClick(tag)}>
                      {tag}
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
          </div>
          <Popover.Arrow className="PopoverArrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default PopoverWrapper;
